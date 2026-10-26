\set ON_ERROR_STOP on
begin;
-- Dummy ciphertext and uncallable local fixtures only. No provider requests occur.
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
insert into auth.users(id,email) values
('10111111-1111-4111-8111-111111111111','plivo-owner@example.com'),
('20222222-2222-4222-8222-222222222222','other-plivo-owner@example.com'),
('30333333-3333-4333-8333-333333333333','plivo-agent@example.com');
insert into workspaces(id,name,timezone) values
('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','Customer Plivo test','UTC'),
('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','Other customer','UTC');
insert into memberships values
('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','owner'),
('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','30333333-3333-4333-8333-333333333333','agent'),
('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','20222222-2222-4222-8222-222222222222','owner');
create function pg_temp.expect_plivo_error(statement text,expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlerrm=expected then return; end if;
    raise exception 'Expected %, received %',expected,sqlerrm;
  end;
  raise exception 'Expected %, statement succeeded',expected;
end $$;
create function pg_temp.connect_customer(actor uuid default '10111111-1111-4111-8111-111111111111',connection_id uuid default 'cccccccc-1111-4111-8111-cccccccccccc',auth_id text default 'MACUSTOMERTESTONE') returns uuid language sql as $$
select connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',actor,connection_id,auth_id,repeat('x',32),'[{"number":"+12025550121","label":"Test line one"},{"number":"+12025550122","label":"Test line two"}]','+12025550121')
$$;
select pg_temp.expect_plivo_error($q$select pg_temp.connect_customer('20222222-2222-4222-8222-222222222222')$q$,'administrator_required');
select pg_temp.expect_plivo_error($q$select pg_temp.connect_customer('30333333-3333-4333-8333-333333333333')$q$,'administrator_required');
select pg_temp.expect_plivo_error($q$select pg_temp.connect_customer(auth_id=>'not valid')$q$,'plivo_connection_invalid');
select pg_temp.expect_plivo_error($q$select connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111',gen_random_uuid(),'MATESTACCOUNT',repeat('x',32),'[]','+12025550121')$q$,'plivo_connection_invalid');
select pg_temp.expect_plivo_error($q$select connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111',gen_random_uuid(),'MATESTACCOUNT',repeat('x',32),'[{"number":"+12025550121"},{"number":"+12025550121"}]','+12025550121')$q$,'plivo_connection_invalid');
select pg_temp.expect_plivo_error($q$select connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111',gen_random_uuid(),'MATESTACCOUNT',repeat('x',32),'[{"number":"+12025550121","unexpected":"key"}]','+12025550121')$q$,'plivo_connection_invalid');
select pg_temp.expect_plivo_error($q$select connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111',gen_random_uuid(),'MATESTACCOUNT',repeat('x',32),'[{"number":"+12025550121"}]','+12025550999')$q$,'plivo_caller_not_owned');
insert into voice_settings(workspace_id,caller_id,allowed_destinations,enabled,max_concurrency) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','+12025550999','{+12025550123}',true,3);
insert into integration_acceptances(workspace_id,channel,evidence,expires_at) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','voice','Superseded local account acceptance',now()+interval '1 hour');
select pg_temp.connect_customer();
do $$ begin
if (select enabled from voice_settings where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') then raise exception 'connect enabled calls'; end if;
if exists(select 1 from integration_acceptances where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') then raise exception 'old acceptance retained'; end if;
if not exists(select 1 from voice_settings where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and allowed_destinations='{+12025550123}' and max_concurrency=3 and plivo_connection_id='cccccccc-1111-4111-8111-cccccccccccc') then raise exception 'existing calling limits lost'; end if;
if not exists(select 1 from integrations where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and provider='plivo' and status='connected' and external_id='MACUSTOMERTESTONE' and metadata->>'connectionMode'='customer') then raise exception 'customer integration missing'; end if;
if exists(select 1 from integrations where metadata::text like '%xxxxxxxx%') then raise exception 'ciphertext in integration metadata'; end if;
end $$;
select pg_temp.expect_plivo_error($q$select connect_plivo_account('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','20222222-2222-4222-8222-222222222222',gen_random_uuid(),'MACUSTOMERTESTONE',repeat('x',32),'[{"number":"+12025550124"}]','+12025550124')$q$,'plivo_auth_already_connected');
select connect_plivo_account('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','20222222-2222-4222-8222-222222222222','cccccccc-2222-4222-8222-cccccccccccc','MACUSTOMERTESTTWO',repeat('x',32),'[{"number":"+12025550124"}]','+12025550124');
do $$begin
begin update voice_settings set plivo_connection_id='cccccccc-1111-4111-8111-cccccccccccc' where workspace_id='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'; raise exception 'cross-workspace binding accepted'; exception when foreign_key_violation then null; end;
end $$;
select pg_temp.expect_plivo_error($q$select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','20222222-2222-4222-8222-222222222222','cccccccc-1111-4111-8111-cccccccccccc','+12025550121',null,'[{"number":"+12025550121"}]')$q$,'administrator_required');
select pg_temp.expect_plivo_error($q$select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-2222-4222-8222-cccccccccccc','+12025550121',null,'[{"number":"+12025550121"}]')$q$,'plivo_connection_changed');
select pg_temp.expect_plivo_error($q$select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-cccccccccccc','+12025550999',null,'[{"number":"+12025550121"}]')$q$,'plivo_caller_not_owned');
select pg_temp.expect_plivo_error($q$select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-cccccccccccc','+12025550121','invalid','[{"number":"+12025550121"}]')$q$,'invalid_transfer_number');

insert into contacts(id,workspace_id,name,phone,consent) values('dddddddd-1111-4111-8111-dddddddddddd','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','Test recipient','+12025550123',true);
insert into voice_agents(id,workspace_id,name,language,instructions,max_duration_seconds,status) values('eeeeeeee-1111-4111-8111-eeeeeeeeeeee','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','Test agent','en','Local test instructions',60,'ready');
insert into wallets(workspace_id,balance) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1000);
insert into sending_windows(workspace_id,channel,weekday,start_time,end_time,enabled) select 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','voice',day,'00:00','23:59:59',true from generate_series(0,6) day;
insert into credit_rates(channel,unit,rate_microcredits,effective_at,approved) values('voice','minute',100,now(),true);
insert into integration_acceptances(workspace_id,channel,evidence,expires_at) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','voice','Disposable customer account fixtures',now()+interval '1 hour');
update voice_settings set enabled=true where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
select id from prepare_voice_call('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','eeeeeeee-1111-4111-8111-eeeeeeeeeeee','dddddddd-1111-4111-8111-dddddddddddd','ffffffff-1111-4111-8111-ffffffffffff',repeat('a',64));
do $$begin
if not exists(select 1 from calls where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and plivo_connection_id='cccccccc-1111-4111-8111-cccccccccccc') then raise exception 'call not account-bound'; end if;
end $$;
select pg_temp.expect_plivo_error($q$select pg_temp.connect_customer(connection_id=>'cccccccc-3333-4333-8333-cccccccccccc')$q$,'plivo_calls_active');
select pg_temp.expect_plivo_error($q$select disconnect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111')$q$,'plivo_calls_active');
select pg_temp.expect_plivo_error($q$select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-cccccccccccc','+12025550121',null,'[{"number":"+12025550121"}]')$q$,'plivo_calls_active');
select pg_temp.expect_plivo_error($q$update calls set plivo_connection_id=null where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$q$,'immutable_call_connection');
select pg_temp.expect_plivo_error($q$update calls set workspace_id='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb' where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$q$,'immutable_call_connection');
select pg_temp.expect_plivo_error($q$update calls set request_key=gen_random_uuid() where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$q$,'immutable_call_connection');
select pg_temp.expect_plivo_error($q$insert into calls(workspace_id,contact_id,agent_id,request_key,caller_id,plivo_connection_id) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','dddddddd-1111-4111-8111-dddddddddddd','eeeeeeee-1111-4111-8111-eeeeeeeeeeee',gen_random_uuid(),'+12025550121','cccccccc-2222-4222-8222-cccccccccccc')$q$,'plivo_connection_changed');
select pg_temp.expect_plivo_error($q$insert into calls(workspace_id,contact_id,agent_id,request_key,caller_id) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','dddddddd-1111-4111-8111-dddddddddddd','eeeeeeee-1111-4111-8111-eeeeeeeeeeee',gen_random_uuid(),'+12025550999')$q$,'plivo_caller_not_owned');
select reject_voice_call(id,'local_test_finished') from calls where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
-- Verified-number refresh with unchanged settings preserves acceptance.
select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-cccccccccccc','+12025550121',null,'[{"number":"+12025550121"},{"number":"+12025550122"}]');
do $$begin
if not exists(select 1 from integration_acceptances where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') or not (select enabled from voice_settings where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') then raise exception 'unchanged settings invalidated acceptance'; end if;
end $$;
select update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-cccccccccccc','+12025550122','+12025550125','[{"number":"+12025550121"},{"number":"+12025550122"}]');
do $$begin
if exists(select 1 from integration_acceptances where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') or (select enabled from voice_settings where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') then raise exception 'changed settings did not invalidate acceptance'; end if;
end $$;
select pg_temp.connect_customer(connection_id=>'cccccccc-3333-4333-8333-cccccccccccc');
do $$begin
if not exists(select 1 from plivo_connections where id='cccccccc-1111-4111-8111-cccccccccccc' and status='disconnected' and ciphertext is null) then raise exception 'rotated token not wiped'; end if;
if not exists(select 1 from calls where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and plivo_connection_id='cccccccc-1111-4111-8111-cccccccccccc') then raise exception 'historical account binding changed'; end if;
end $$;
select pg_temp.expect_plivo_error($q$select pg_temp.connect_customer()$q$,'plivo_connection_changed');
select pg_temp.expect_plivo_error($q$select disconnect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','30333333-3333-4333-8333-333333333333')$q$,'administrator_required');
select disconnect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111');
do $$begin
if exists(select 1 from plivo_connections where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and (ciphertext is not null or status<>'disconnected')) then raise exception 'disconnected token not wiped'; end if;
if exists(select 1 from voice_settings where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and (plivo_connection_id is not null or enabled)) then raise exception 'disconnected calling still configured'; end if;
if not exists(select 1 from integrations where workspace_id='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' and provider='plivo' and status='not_connected' and external_id is null) then raise exception 'disconnect integration state incorrect'; end if;
end $$;
select pg_temp.expect_plivo_error($q$insert into calls(workspace_id,contact_id,agent_id,request_key,caller_id) values('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','dddddddd-1111-4111-8111-dddddddddddd','eeeeeeee-1111-4111-8111-eeeeeeeeeeee',gen_random_uuid(),'+12025550121')$q$,'plivo_connection_required');
set local role authenticated;
select set_config('request.jwt.claim.sub','10111111-1111-4111-8111-111111111111',true);
do $$declare touched integer; begin
if exists(select 1 from plivo_connections) then raise exception 'customer tokens exposed'; end if;
begin insert into plivo_connections(id,workspace_id,auth_id,ciphertext,status,last_verified_at,phone_numbers) values(gen_random_uuid(),'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','MABROWSERACCOUNT',repeat('x',32),'connected',now(),'[{"number":"+12025550121"}]'); raise exception 'browser wrote credentials'; exception when insufficient_privilege then null; end;
update plivo_connections set ciphertext=repeat('y',32); get diagnostics touched=row_count;
if touched<>0 then raise exception 'browser token update permitted'; end if;
delete from plivo_connections; get diagnostics touched=row_count;
if touched<>0 then raise exception 'browser token deletion permitted'; end if;
end $$;
-- No mutation RPC, even a tenant-scoped request, may be invoked by the browser.
do $$begin
begin perform connect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111',gen_random_uuid(),'MABROWSERACCOUNT',repeat('x',32),'[{"number":"+12025550121"}]','+12025550121'); raise exception 'browser connect RPC permitted'; exception when insufficient_privilege then null; end;
begin perform update_plivo_settings('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111','cccccccc-3333-4333-8333-cccccccccccc','+12025550121',null,'[{"number":"+12025550121"}]'); raise exception 'browser settings RPC permitted'; exception when insufficient_privilege then null; end;
begin perform disconnect_plivo_account('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','10111111-1111-4111-8111-111111111111'); raise exception 'browser disconnect RPC permitted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','20222222-2222-4222-8222-222222222222',true);
do $$begin
if exists(select 1 from plivo_connections) then raise exception 'cross-tenant customer credentials exposed'; end if;
end $$;
reset role;
set local role service_role;
do $$begin
if (select count(*) from plivo_connections where workspace_id in ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'))<>3 then raise exception 'server could not resolve customer accounts'; end if;
begin update plivo_connections set ciphertext=repeat('y',32); raise exception 'server bypassed connection mutation RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'PASS: customer Plivo isolation, caller ownership, immutable call binding, active-call mutation blocks, acceptance invalidation and token erasure'
