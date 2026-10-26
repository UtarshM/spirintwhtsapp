"""Only run against a disposable PostgreSQL database, never hosted customer data."""
import argparse
import subprocess
import uuid
from concurrent.futures import ThreadPoolExecutor

parser = argparse.ArgumentParser()
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', default='55439')
parser.add_argument('--database', default='postgres')
args = parser.parse_args()
base = ['psql', '-h', args.host, '-p', args.port, '-d', args.database, '-v', 'ON_ERROR_STOP=1', '-At']
def sql(statement):
    return subprocess.run(base + ['-c', statement], capture_output=True, text=True)

w, user, agent, contact, request = [str(uuid.uuid4()) for _ in range(5)]
setup = sql(f"""
insert into auth.users(id,email) values('{user}','voice-concurrency@example.com');
insert into workspaces(id,name,timezone) values('{w}','Voice concurrency QA','UTC');
insert into memberships values('{w}','{user}','owner');
insert into wallets(workspace_id,balance) values('{w}',10000);
insert into contacts(id,workspace_id,name,phone,consent) values('{contact}','{w}','Test contact','+12025550123',true);
insert into voice_agents(id,workspace_id,name,language,instructions,status,max_duration_seconds) values('{agent}','{w}','Test agent','en','Answer test questions','ready',60);
select connect_plivo_account('{w}','{user}','{uuid.uuid4()}','MA{w.replace("-", "")}','{'x'*32}','[{{"number":"+12025550124","label":"Disposable test number"}}]','+12025550124');
insert into integration_acceptances(workspace_id,channel,evidence,expires_at) values('{w}','voice','Disposable concurrency fixture',now()+interval '1 hour');
update voice_settings set allowed_destinations='{{+12025550123}}',enabled=true where workspace_id='{w}';
insert into sending_windows(workspace_id,channel,weekday,start_time,end_time,enabled) select '{w}','voice',day,'00:00','23:59:59',true from generate_series(0,6) day;
insert into credit_rates(channel,unit,rate_microcredits,effective_at,approved) values('voice','minute',100,now(),true);
""")
assert setup.returncode == 0, setup.stderr

def prepare(hash_value):
    return sql(f"begin; select id||':'||session_hash from prepare_voice_call('{w}','{user}','{agent}','{contact}','{request}','{hash_value}'); select pg_sleep(0.15); commit")
with ThreadPoolExecutor(max_workers=2) as pool:
    outcomes = list(pool.map(prepare, ['a'*64, 'b'*64]))
assert all(r.returncode == 0 for r in outcomes), [r.stderr for r in outcomes]
state = sql(f"select count(*)||':'||sum(rate_microcredits) from calls where workspace_id='{w}'")
assert state.stdout.strip() == '1:100', state.stdout
record = sql(f"select id||':'||session_hash from calls where workspace_id='{w}'").stdout.strip()
call_id, session_hash = record.split(':')
# Exactly one request owns the private launch capability; the replay observes it without redial.
assert sum(out.stdout.splitlines()[1].endswith(h) for out, h in zip(outcomes, ['a'*64, 'b'*64])) == 1
wallet = sql(f"select reserved from wallets where workspace_id='{w}'")
assert wallet.stdout.strip() == '100', wallet.stdout
other = sql(f"select prepare_voice_call('{w}','{user}','{agent}','{contact}','{uuid.uuid4()}','{'c'*64}')")
assert other.returncode != 0 and 'workspace_call_limit' in other.stderr, other.stderr

provider, provider_request = str(uuid.uuid4()), str(uuid.uuid4())
bound = sql(f"select id from bind_voice_call('{call_id}','{session_hash}','{provider}','{provider_request}')")
assert bound.returncode == 0, bound.stderr
def claim(_):
    return sql(f"begin; select id from claim_voice_stream('{call_id}','{session_hash}'); select pg_sleep(0.15); commit")
with ThreadPoolExecutor(max_workers=2) as pool:
    claims = list(pool.map(claim, [1,2]))
assert sum(r.returncode == 0 for r in claims) == 1, [r.stderr for r in claims]
assert any('invalid_voice_session' in r.stderr for r in claims)
print('PASS: concurrent call launches reserve once, only one launch owns the dial capability, limits hold and only one stream can claim a session')

# A finished call queues one analysis job; simultaneous workers cannot lease it twice.
finished = sql(f"select record_voice_runtime_end('{call_id}'); select finish_voice_call('{call_id}','{provider}',1,'completed')")
assert finished.returncode == 0, finished.stderr
def analysis_claim(_):
    return sql("begin; select call_id from claim_voice_analyses(1); select pg_sleep(0.15); commit")
with ThreadPoolExecutor(max_workers=2) as pool:
    leases = list(pool.map(analysis_claim, [1, 2]))
assert all(r.returncode == 0 for r in leases), [r.stderr for r in leases]
assert sum(call_id in r.stdout for r in leases) == 1, [r.stdout for r in leases]
print('PASS: simultaneous analysis workers lease each completed call exactly once')
