\set ON_ERROR_STOP on
begin;
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','one@example.com'),('22222222-2222-4222-8222-222222222222','two@example.com'),('33333333-3333-4333-8333-333333333333','agent@example.com');
insert into workspaces(id,name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Two');
insert into memberships values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner'),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','agent');
select save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',0,'{"version":1,"marker":"tenant-one"}');
select save_workspace_draft('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',0,'{"version":1,"marker":"tenant-two"}');
do $$begin
begin perform save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',0,'{"version":1}');raise exception 'stale write allowed';exception when raise_exception then if sqlerrm<>'draft_revision_conflict' then raise;end if;end;
begin perform save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',1,'{"version":1}');raise exception 'cross tenant write allowed';exception when raise_exception then if sqlerrm<>'draft_access_denied' then raise;end if;end;
begin perform save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333',1,'{"version":1}');raise exception 'agent write allowed';exception when raise_exception then if sqlerrm<>'draft_access_denied' then raise;end if;end;
if (select state->>'marker' from workspace_drafts where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>'tenant-one' then raise exception 'failed write changed state';end if;
end $$;
select save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',1,'{"version":1,"marker":"updated"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$begin
if (select count(*) from workspace_drafts)<>1 then raise exception 'draft tenant read leaked';end if;
if (select revision from workspace_drafts)<>2 then raise exception 'draft revision incorrect';end if;
begin update workspace_drafts set state='{"version":1}' where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';if found then raise exception 'direct update allowed';end if;exception when insufficient_privilege then null;end;
begin insert into workspace_drafts(workspace_id,state,revision,updated_by) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"version":1}',3,'11111111-1111-4111-8111-111111111111');raise exception 'direct insert allowed';exception when insufficient_privilege then null;end;
begin perform save_workspace_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',2,'{"version":1}');raise exception 'browser RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS: draft tenant reads, role checks, direct-write denial, RPC denial, revision conflicts, persistence'
