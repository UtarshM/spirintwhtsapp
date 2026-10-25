\set ON_ERROR_STOP on
begin;
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','one@example.com'),('22222222-2222-4222-8222-222222222222','two@example.com');
insert into workspaces(id,name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Two');
insert into memberships values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
insert into integrations(workspace_id,provider,status,external_id,metadata) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','meta','connected','1234','{"waba_id":"waba-1"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','meta','connected','5678','{"waba_id":"waba-2"}');
insert into contacts(id,workspace_id,name,phone,consent) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Known','+919876543210',true);
insert into sequences(id,workspace_id,name) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test');
insert into enrollments(workspace_id,sequence_id,contact_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into outbox(workspace_id,contact_id,kind,payload,idempotency_key) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','send','{}','before-reply');
insert into provider_events(id,provider,event_id,payload) values('00000000-0000-4000-8000-000000000001','meta','inbound','{}'),('00000000-0000-4000-8000-000000000002','meta','read','{}'),('00000000-0000-4000-8000-000000000003','meta','late','{}'),('00000000-0000-4000-8000-000000000004','meta','before-send','{}'),('00000000-0000-4000-8000-000000000005','meta','rollback','{}');
select normalize_meta_event('00000000-0000-4000-8000-000000000001','[{"kind":"inbound","phoneNumberId":"1234","wabaId":"waba-1","providerId":"in-1","phone":"+919876543210","at":"2026-10-25T10:00:00Z","body":"Help","messageType":"text"},{"kind":"inbound","phoneNumberId":"1234","wabaId":"waba-1","providerId":"in-2","phone":"+919876543211","profileName":"New customer","at":"2026-10-25T10:01:00Z","body":"Hi","messageType":"image","media":{"id":"media1"}}]','[]');
select normalize_meta_event('00000000-0000-4000-8000-000000000001','[]','[]');
do $$begin
if (select count(*) from messages where direction='inbound')<>2 then raise exception 'inbound replay duplicated';end if;
if (select consent from contacts where phone='+919876543211') then raise exception 'inbound inferred consent';end if;
if not (select consent from contacts where phone='+919876543210') then raise exception 'existing consent changed';end if;
if exists(select 1 from enrollments where status='active') or exists(select 1 from outbox where status='pending') then raise exception 'reply suppression failed';end if;
if (select count(*) from conversations)<>2 then raise exception 'unexpected conversation count';end if;
end $$;
insert into messages(workspace_id,conversation_id,direction,body,provider_id) select workspace_id,id,'outbound','Sent earlier','out-1' from conversations where contact_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select normalize_meta_event('00000000-0000-4000-8000-000000000002','[{"kind":"status","phoneNumberId":"1234","wabaId":"waba-1","providerId":"out-1","phone":"+919876543210","at":"2026-10-25T10:03:00Z","status":"read"}]','[]');
select normalize_meta_event('00000000-0000-4000-8000-000000000003','[{"kind":"status","phoneNumberId":"1234","wabaId":"waba-1","providerId":"out-1","phone":"+919876543210","at":"2026-10-25T10:01:00Z","status":"sent"},{"kind":"status","phoneNumberId":"1234","wabaId":"waba-1","providerId":"out-1","phone":"+919876543210","at":"2026-10-25T10:04:00Z","status":"failed","errorCode":"131026"}]','[]');
select normalize_meta_event('00000000-0000-4000-8000-000000000004','[{"kind":"status","phoneNumberId":"1234","wabaId":"waba-1","providerId":"later-1","phone":"+919876543210","at":"2026-10-25T10:02:00Z","status":"delivered"}]','[]');
insert into messages(workspace_id,conversation_id,direction,body,provider_id) select workspace_id,id,'outbound','Late database write','later-1' from conversations where contact_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$begin
if (select status from messages where provider_id='out-1')<>'read' then raise exception 'receipt regressed';end if;
if (select status from messages where provider_id='later-1')<>'delivered' then raise exception 'early receipt was lost';end if;
if (select count(*) from activity_events where kind='whatsapp.status')<>4 then raise exception 'status timeline incorrect';end if;
begin
perform normalize_meta_event('00000000-0000-4000-8000-000000000005','[{"kind":"inbound","phoneNumberId":"1234","wabaId":"waba-1","providerId":"must-rollback","phone":"+919876543212","at":"2026-10-25T10:00:00Z","body":"Rollback"},{"kind":"inbound","phoneNumberId":"9999","wabaId":"waba-x","providerId":"bad-map","phone":"+919876543213","at":"2026-10-25T10:00:00Z","body":"Unmapped"}]','[]');raise exception 'unmapped event accepted';
exception when raise_exception then if sqlerrm<>'meta_unmapped_number' then raise;end if;end;
if exists(select 1 from contacts where phone='+919876543212') then raise exception 'partial transaction committed';end if;
if (select processed_at from provider_events where event_id='rollback') is not null then raise exception 'failed event marked processed';end if;
end $$;
select fail_meta_event('00000000-0000-4000-8000-000000000005','meta_unmapped_number');
do $$begin
if not exists(select 1 from provider_events where event_id='rollback' and attempts=1 and next_attempt_at>now() and last_error='meta_unmapped_number') then raise exception 'retry backoff not recorded';end if;
end $$;
insert into auth.users(id,email) values('33333333-3333-4333-8333-333333333333','agent@example.com'),('44444444-4444-4444-8444-444444444444','other-agent@example.com');
insert into memberships values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','agent'),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','agent');
update enrollments set status='active';
insert into outbox(workspace_id,contact_id,kind,payload,idempotency_key) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','send','{}','before-handoff');
do $$declare conversation_id uuid;begin
select id into conversation_id from conversations where contact_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
perform manage_provider_conversation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',conversation_id,'11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','open');
if exists(select 1 from enrollments where status='active') or exists(select 1 from outbox where status='pending') then raise exception 'takeover did not suppress outreach';end if;
if (select count(*) from audit_events where action='conversation.manage')<>1 then raise exception 'assignment not audited';end if;
begin perform manage_provider_conversation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',conversation_id,'44444444-4444-4444-8444-444444444444','44444444-4444-4444-8444-444444444444','open');raise exception 'agent stole assigned conversation';exception when raise_exception then if sqlerrm<>'conversation_access_denied' then raise;end if;end;
begin perform manage_provider_conversation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',conversation_id,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','open');raise exception 'foreign assignee allowed';exception when raise_exception then if sqlerrm<>'conversation_access_denied' then raise;end if;end;
perform manage_provider_conversation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',conversation_id,'33333333-3333-4333-8333-333333333333',null,'closed');
if not exists(select 1 from conversations where id=conversation_id and assigned_to is null and status='closed') then raise exception 'agent could not release own conversation';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
if exists(select 1 from meta_message_receipts) then raise exception 'receipt tenant leak';end if;
if exists(select 1 from messages) then raise exception 'message tenant leak';end if;
begin perform normalize_meta_event('00000000-0000-4000-8000-000000000005','[]','[]');raise exception 'normalizer callable by browser';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS: atomic Meta normalization, unknown contacts, explicit consent, stop-on-reply, replay, monotonic/early receipts, retry backoff, tenant isolation, assignment roles and takeover suppression'
