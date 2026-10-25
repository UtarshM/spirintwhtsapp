"""Run only against a disposable local database: python3 ... --host SOCKET --port PORT."""
import argparse
import concurrent.futures
import subprocess
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', required=True)
args = parser.parse_args()
command = ['psql', '-h', args.host, '-p', args.port, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At']
def sql(query):
    return subprocess.run(command + ['-c', query], capture_output=True, text=True)
workspace = '44444444-4444-4444-8444-444444444444'
actor = '55555555-5555-4555-8555-555555555555'
setup = sql(f"insert into auth.users(id,email) values('{actor}','concurrency@example.com'); insert into workspaces(id,name) values('{workspace}','Concurrency'); insert into memberships values('{workspace}','{actor}','owner');")
assert setup.returncode == 0, setup.stderr
try:
    query = f"select save_workspace_draft('{workspace}','{actor}',0,'{{\"version\":1}}');"
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results = list(pool.map(sql, [query, query]))
    assert sum(result.returncode == 0 for result in results) == 1, [result.stderr for result in results]
    assert sum('draft_revision_conflict' in result.stderr for result in results) == 1
    assert sql(f"select revision from workspace_drafts where workspace_id='{workspace}'").stdout.strip() == '1'
    print('PASS: concurrent first saves allow exactly one revision; the stale writer conflicts')
finally:
    cleaned = sql(f"delete from workspaces where id='{workspace}'; delete from auth.users where id='{actor}';")
    assert cleaned.returncode == 0, cleaned.stderr
