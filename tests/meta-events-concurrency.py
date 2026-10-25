"""Disposable PostgreSQL only: simultaneous events for the same first-time sender."""
import argparse
import concurrent.futures
import json
import subprocess
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True)
parser.add_argument('--port', required=True)
parser.add_argument('--database', default='postgres')
args = parser.parse_args()
command = ['psql', '-h', args.host, '-p', args.port, '-d', args.database, '-v', 'ON_ERROR_STOP=1', '-At']
def sql(query):
    return subprocess.run(command + ['-c', query], capture_output=True, text=True)
w = '66666666-6666-4666-8666-666666666666'
events = ['77777777-7777-4777-8777-777777777771', '77777777-7777-4777-8777-777777777772']
setup = sql(f"insert into workspaces(id,name) values('{w}','Meta concurrency'); insert into integrations(workspace_id,provider,status,external_id) values('{w}','meta','connected','999888777'); insert into provider_events(id,provider,event_id,payload) values('{events[0]}','meta','concurrent-meta-a','{{}}'),('{events[1]}','meta','concurrent-meta-b','{{}}');")
assert setup.returncode == 0, setup.stderr
try:
    actions = json.dumps([dict(kind='inbound', phoneNumberId='999888777', wabaId='test-waba', providerId='same-incoming', phone='+919876543210', at='2026-10-25T10:00:00Z', body='Hello', messageType='text')]).replace("'", "''")
    def process(event):
        return sql(f"select normalize_meta_event('{event}','{actions}','[]');")
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results = list(pool.map(process, events))
    assert all(result.returncode == 0 for result in results), [result.stderr for result in results]
    for table in ['contacts', 'conversations', 'messages', 'activity_events']:
        assert sql(f"select count(*) from {table} where workspace_id='{w}'").stdout.strip() == '1', table
    assert sql(f"select count(*) from provider_events where id in ('{events[0]}','{events[1]}') and processed_at is not null").stdout.strip() == '2'
    print('PASS: simultaneous first-contact events create one contact, conversation, message and timeline event')
finally:
    cleanup = sql(f"delete from activity_events where workspace_id='{w}'; delete from messages where workspace_id='{w}'; delete from conversations where workspace_id='{w}'; delete from contacts where workspace_id='{w}'; delete from integrations where workspace_id='{w}'; delete from workspaces where id='{w}'; delete from provider_events where id in ('{events[0]}','{events[1]}');")
    assert cleanup.returncode == 0, cleanup.stderr
