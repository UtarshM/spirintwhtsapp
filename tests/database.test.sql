\set ON_ERROR_STOP on
begin;
grant usage on schema public,auth to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant select on auth.users to authenticated;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','one@example.com'),('22222222-2222-4222-8222-222222222222','two@example.com');
insert into workspaces(id,name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Two');
insert into memberships values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
insert into wallets(workspace_id,balance) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',100),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',100);
insert into contacts(id,workspace_id,name,email,consent) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One','one@example.com',true),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Two','two@example.com',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$begin
if (select count(*) from contacts)<>1 then raise exception 'RLS leaks contacts';end if;
if (select count(*) from wallets)<>1 then raise exception 'RLS leaks wallets';end if;
if exists(select 1 from contacts where workspace_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'cross workspace read';end if;
begin insert into contacts(workspace_id,name) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Unauthorized');raise exception 'write unexpectedly allowed';exception when insufficient_privilege then null;end;
begin perform reserve_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10,'illegal');raise exception 'RPC unexpectedly allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$declare r uuid;r2 uuid;begin
r:=reserve_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',70,'test');
r2:=reserve_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',70,'test');
if r<>r2 then raise exception 'reservation replay not idempotent';end if;
begin perform reserve_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',40,'overspend');raise exception 'overspend allowed';exception when raise_exception then if sqlerrm<>'insufficient_credits' then raise;end if;end;
perform settle_credits(r,50);perform settle_credits(r,50);
if not exists(select 1 from wallets where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and balance=50 and reserved=0) then raise exception 'settlement incorrect';end if;
begin perform settle_credits(r,40);raise exception 'conflicting settlement allowed';exception when raise_exception then if sqlerrm<>'settlement_conflict' then raise;end if;end;
end $$;
insert into payments(workspace_id,provider_order_id,amount_paise,credits) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','order_test',5000,100);
select capture_payment('order_test','payment_test',5000);
select capture_payment('order_test','payment_test',5000);
do $$begin
if (select balance from wallets where workspace_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>150 then raise exception 'payment double credited';end if;
begin update credit_ledger set amount=999;raise exception 'ledger changed';exception when raise_exception then if sqlerrm<>'immutable_ledger' then raise;end if;end;
end $$;
insert into sequences(id,workspace_id,name) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test');
insert into enrollments(workspace_id,sequence_id,contact_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into conversations(id,workspace_id,contact_id,channel) values('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','whatsapp');
insert into outbox(workspace_id,contact_id,kind,payload,idempotency_key) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','send','{}','stop-test');
insert into messages(workspace_id,conversation_id,direction,body) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ffffffff-ffff-4fff-8fff-ffffffffffff','inbound','Hello');
do $$begin
if exists(select 1 from enrollments where status='active') then raise exception 'reply did not stop sequence';end if;
if exists(select 1 from outbox where status='pending') then raise exception 'reply did not cancel pending job';end if;
end $$;
rollback;
\echo 'PASS: tenant isolation, RPC authorization, credit accounting, payment replay, ledger immutability, reply suppression'
