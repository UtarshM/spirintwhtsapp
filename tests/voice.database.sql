\set ON_ERROR_STOP on
begin;
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','voice@example.com'),('22222222-2222-4222-8222-222222222222','other@example.com');
insert into workspaces(id,name,timezone) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Voice','UTC'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Other','UTC');
insert into memberships values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
insert into wallets(workspace_id,balance) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1000);
insert into contacts(id,workspace_id,name,phone,consent) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Caller','+919876543210',true);
insert into voice_agents(id,workspace_id,name,language,instructions,max_duration_seconds,status) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Agent','en','Help the caller',180,'ready');
create function pg_temp.prepare_test(k uuid default 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') returns calls language sql as $$select prepare_voice_call('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc',k,repeat('a',64))$$;
do $$begin
begin perform pg_temp.prepare_test(); raise exception 'acceptance gate bypassed'; exception when raise_exception then if sqlerrm<>'voice_acceptance_required' then raise; end if; end;
end $$;
select connect_plivo_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','99999999-9999-4999-8999-999999999999','MAVOICETESTFIXTURE',repeat('x',32),'[{"number":"+12025550123","label":"Disposable test number"}]','+12025550123');
insert into integration_acceptances(workspace_id,channel,evidence,expires_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','voice','Disposable local fixtures only',now()+interval '1 hour');
update voice_settings set allowed_destinations='{+919876543210}',enabled=true where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$begin
begin perform pg_temp.prepare_test(); raise exception 'calling window bypassed'; exception when raise_exception then if sqlerrm<>'outside_calling_window' then raise; end if; end;
end $$;
insert into sending_windows(workspace_id,channel,weekday,start_time,end_time,enabled) select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','voice',day,'00:00','23:59:59',true from generate_series(0,6) day;
do $$begin
begin perform pg_temp.prepare_test(); raise exception 'rate gate bypassed'; exception when raise_exception then if sqlerrm<>'approved_voice_rate_required' then raise; end if; end;
end $$;
insert into credit_rates(channel,unit,rate_microcredits,effective_at,approved) values('voice','minute',100,now()-interval '1 minute',true);
update voice_settings set allowed_destinations='{}';
do $$begin
begin perform pg_temp.prepare_test(); raise exception 'destination gate bypassed'; exception when raise_exception then if sqlerrm<>'destination_not_allowed' then raise; end if; end;
end $$;
update voice_settings set allowed_destinations='{+919876543210}';
update contacts set consent=false;
do $$begin
begin perform pg_temp.prepare_test(); raise exception 'consent gate bypassed'; exception when raise_exception then if sqlerrm<>'contact_not_callable' then raise; end if; end;
end $$;
update contacts set consent=true;
do $$declare ca calls; replay calls; begin
ca:=pg_temp.prepare_test(); replay:=pg_temp.prepare_test();
if ca.id<>replay.id or (select count(*) from calls)<>1 or (select reserved from wallets)<>300 then raise exception 'call replay/reservation incorrect'; end if;
if ca.plivo_connection_id<>'99999999-9999-4999-8999-999999999999'::uuid then raise exception 'customer Plivo connection not snapshotted'; end if;
begin perform pg_temp.prepare_test('ffffffff-ffff-4fff-8fff-ffffffffffff'); raise exception 'concurrency gate bypassed'; exception when raise_exception then if sqlerrm<>'workspace_call_limit' then raise; end if; end;
begin perform prepare_voice_call(ca.workspace_id,'22222222-2222-4222-8222-222222222222',ca.agent_id,ca.contact_id,gen_random_uuid(),repeat('a',64)); raise exception 'foreign actor allowed'; exception when raise_exception then if sqlerrm<>'administrator_required' then raise; end if; end;
update voice_agents set instructions='Changed after launch';
if ca.agent_snapshot->>'instructions'<>'Help the caller' then raise exception 'agent snapshot changed'; end if;
begin perform bind_voice_call(ca.id,repeat('b',64),'12345678-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789def'); raise exception 'wrong token allowed'; exception when raise_exception then if sqlerrm<>'invalid_voice_session' then raise; end if; end;
perform bind_voice_call(ca.id,repeat('a',64),'12345678-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789def');
begin perform bind_voice_call(ca.id,repeat('a',64),'99999999-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789def'); raise exception 'call hijacked'; exception when raise_exception then if sqlerrm<>'call_binding_conflict' then raise; end if; end;
perform claim_voice_stream(ca.id,repeat('a',64));
begin perform claim_voice_stream(ca.id,repeat('a',64)); raise exception 'stream replay allowed'; exception when raise_exception then if sqlerrm<>'invalid_voice_session' then raise; end if; end;
insert into call_turns(workspace_id,call_id,turn_key,role,content) values(ca.workspace_id,ca.id,gen_random_uuid(),'user','Please stop calling.');
perform voice_opt_out(ca.id); perform voice_opt_out(ca.id);
if (select consent from contacts) or (select opted_out_at from contacts) is null then raise exception 'voice opt-out failed'; end if;
begin perform finish_voice_call(ca.id,'12345678-1234-4234-8234-123456789abc',600,'completed'); raise exception 'excess duration settled'; exception when raise_exception then if sqlerrm<>'call_duration_exceeded' then raise; end if; end;
if (select reserved from wallets)<>300 then raise exception 'uncertain reservation lost'; end if;
begin perform finish_voice_call(ca.id,'12345678-1234-4234-8234-123456789abc',0,'failed'); raise exception 'callback bypassed runtime meter'; exception when raise_exception then if sqlerrm<>'voice_runtime_usage_pending' then raise; end if; end;
update calls set stream_claimed_at=clock_timestamp()-interval '61 seconds' where id=ca.id;
perform record_voice_runtime_end(ca.id);
perform record_voice_runtime_end(ca.id);
if (select ai_runtime_seconds from calls where id=ca.id) not between 61 and 62 then raise exception 'runtime meter not server measured'; end if;
perform finish_voice_call(ca.id,'12345678-1234-4234-8234-123456789abc',61,'completed');
perform finish_voice_call(ca.id,'12345678-1234-4234-8234-123456789abc',61,'completed');
if (select balance from wallets)<>800 or (select reserved from wallets)<>0 or (select count(*) from credit_ledger where kind='usage')<>1 then raise exception 'settlement replay incorrect'; end if;
if (select transcript from calls) not like '%Please stop calling.%' then raise exception 'transcript missing'; end if;
begin perform finish_voice_call(ca.id,'12345678-1234-4234-8234-123456789abc',62,'completed'); raise exception 'duration conflict accepted'; exception when raise_exception then if sqlerrm<>'call_duration_conflict' then raise; end if; end;
end $$;
update contacts set consent=true,opted_out_at=null;
do $$declare ca calls; begin
ca:=pg_temp.prepare_test('ffffffff-ffff-4fff-8fff-ffffffffffff');
perform request_voice_stop(ca.workspace_id,'11111111-1111-4111-8111-111111111111',ca.id);
begin perform bind_voice_call(ca.id,repeat('a',64),'12345678-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789def'); raise exception 'cancelled call answered'; exception when raise_exception then if sqlerrm<>'invalid_voice_session' then raise; end if; end;
if (select reserved from wallets)<>300 then raise exception 'stop request released unconfirmed call credits'; end if;
perform reject_voice_call(ca.id,'plivo_request_rejected');
if (select reserved from wallets)<>0 or (select balance from wallets)<>800 then raise exception 'rejection did not release reservation'; end if;
if exists(select 1 from calls where reconciliation_state<>'settled') then raise exception 'settled call left on reconciliation queue'; end if;
end $$;
-- Telephony duration cannot replace platform AI usage when customers own tokens.
do $$declare ca calls; provider text:=gen_random_uuid()::text; before_balance bigint; begin
select balance into before_balance from wallets where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
ca:=pg_temp.prepare_test(gen_random_uuid());
perform bind_voice_call(ca.id,repeat('a',64),provider,gen_random_uuid()::text);
perform claim_voice_stream(ca.id,repeat('a',64));
update calls set stream_claimed_at=clock_timestamp()-interval '10 seconds' where id=ca.id;
perform record_voice_runtime_end(ca.id);
perform finish_voice_call(ca.id,provider,0,'failed');
if (select balance from wallets where workspace_id=ca.workspace_id)<>before_balance-100 then raise exception 'zero provider duration bypassed AI usage'; end if;
before_balance:=before_balance-100;
ca:=pg_temp.prepare_test(gen_random_uuid());
provider:=gen_random_uuid()::text;
update calls set provider_id=provider where id=ca.id;
perform finish_voice_call(ca.id,provider,0,'no-answer');
if (select balance from wallets where workspace_id=ca.workspace_id)<>before_balance or (select reserved from wallets where workspace_id=ca.workspace_id)<>0 then raise exception 'unanswered call charged AI usage'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$begin
if exists(select 1 from calls) then raise exception 'session secrets exposed to client'; end if;
if exists(select 1 from voice_settings) or exists(select 1 from integration_acceptances) then raise exception 'operational configuration exposed'; end if;
begin perform record_voice_runtime_end(gen_random_uuid()); raise exception 'runtime meter callable by browser'; exception when insufficient_privilege then null; end;
begin perform claim_voice_stream(gen_random_uuid(),repeat('a',64)); raise exception 'stream RPC callable by browser'; exception when insufficient_privilege then null; end;
begin insert into voice_settings(workspace_id,caller_id) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','+12025550123'); raise exception 'browser config write allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
if exists(select 1 from call_turns) or exists(select 1 from voice_agents) then raise exception 'voice tenant data leak'; end if;
end $$;
reset role;
rollback;
\echo 'PASS: voice acceptance/consent/destination/window/rate gates, idempotency, concurrency limits, agent snapshots, stream replay, opt-out, settlement, secret protection and tenant isolation'
