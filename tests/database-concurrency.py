"""Run only against the disposable localhost QA database."""
import subprocess
from concurrent.futures import ThreadPoolExecutor
BASE = ['psql', '-h', '127.0.0.1', '-p', '55439', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At']
def sql(text):
    return subprocess.run(BASE + ['-c', text], capture_output=True, text=True)
w = '99999999-9999-4999-8999-999999999999'
setup = sql(f"insert into workspaces(id,name) values('{w}','Concurrency QA'); insert into wallets(workspace_id,balance) values('{w}',100)")
assert setup.returncode == 0, setup.stderr
# Both transactions attempt to reserve 70 out of a balance of 100.
def compete(key):
    return sql(f"begin; select reserve_credits('{w}',70,'{key}'); select pg_sleep(0.2); commit")
with ThreadPoolExecutor(max_workers=2) as pool:
    outcomes = list(pool.map(compete, ['concurrent-a', 'concurrent-b']))
assert sum(r.returncode == 0 for r in outcomes) == 1, outcomes
assert any('insufficient_credits' in r.stderr for r in outcomes), outcomes
state = sql(f"select balance || ':' || reserved from wallets where workspace_id='{w}'")
assert state.stdout.strip() == '100:70', state.stdout
print('PASS: simultaneous database reservations cannot overspend')
