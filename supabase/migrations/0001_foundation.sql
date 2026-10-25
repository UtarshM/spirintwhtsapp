-- Apply through Supabase CLI. Monetary credit quantities are integer microcredits.
create extension if not exists pgcrypto;
create type public.workspace_role as enum ('owner','administrator','agent');
create table public.workspaces(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), timezone text not null default 'Asia/Kolkata', created_at timestamptz not null default now());
create table public.memberships(workspace_id uuid references public.workspaces on delete cascade,user_id uuid references auth.users on delete cascade,role public.workspace_role not null default 'agent',primary key(workspace_id,user_id));
create function public.is_member(w uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where workspace_id=w and user_id=auth.uid())$$;
create function public.is_admin(w uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where workspace_id=w and user_id=auth.uid() and role in ('owner','administrator'))$$;
create table public.contacts(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,name text not null check(length(name) between 1 and 120),company text not null default '',email text,phone text,stage text not null default 'New' check(stage in ('New','Contacted','Qualified','Proposal','Won')),tags text[] not null default '{}',owner_id uuid references auth.users,consent boolean not null default false,opted_out_at timestamptz,created_at timestamptz not null default now(),unique(workspace_id,id));
create unique index contacts_email_unique on public.contacts(workspace_id,lower(email)) where email is not null;
create unique index contacts_phone_unique on public.contacts(workspace_id,phone) where phone is not null;
create index contacts_workspace_created on public.contacts(workspace_id,created_at desc);
create table public.deals(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid not null,title text not null,stage text not null default 'New',value_paise bigint not null default 0 check(value_paise>=0),created_at timestamptz not null default now(),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id));
create table public.tasks(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid,title text not null,due_at timestamptz,completed_at timestamptz,owner_id uuid references auth.users,foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id));
create table public.integrations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,provider text not null check(provider in ('meta','gmail','zoho','plivo')),status text not null default 'not_connected' check(status in ('not_connected','pending','connected','expired','error')),external_id text,metadata jsonb not null default '{}',created_at timestamptz not null default now(),unique(workspace_id,provider),unique(workspace_id,id));
-- No client access, even administrators: server only.
create table public.integration_secrets(integration_id uuid primary key references public.integrations on delete cascade,ciphertext text not null,updated_at timestamptz not null default now());
create table public.templates(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,name text not null,channel text not null check(channel in ('whatsapp','email','voice')),body text not null,status text not null default 'draft',external_id text,created_at timestamptz not null default now(),unique(workspace_id,id));
create table public.campaigns(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,name text not null check(length(name) between 1 and 120),channel text not null check(channel in ('whatsapp','email','voice')),status text not null default 'draft' check(status in ('draft','scheduled','running','paused','cancelled','completed','failed')),template_id uuid,scheduled_at timestamptz,created_at timestamptz not null default now(),foreign key(workspace_id,template_id) references public.templates(workspace_id,id),unique(workspace_id,id));
create table public.sequences(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,name text not null,steps jsonb not null default '[]',status text not null default 'draft' check(status in ('draft','published','paused')),created_at timestamptz not null default now(),unique(workspace_id,id));
create table public.enrollments(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,sequence_id uuid not null,contact_id uuid not null,status text not null default 'active' check(status in ('active','replied','opted_out','handoff','completed','cancelled')),step_index integer not null default 0,next_run_at timestamptz,unique(sequence_id,contact_id),foreign key(workspace_id,sequence_id) references public.sequences(workspace_id,id),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id));
create table public.conversations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid not null,channel text not null check(channel in ('whatsapp','email','voice')),assigned_to uuid references auth.users,status text not null default 'open',created_at timestamptz not null default now(),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id),unique(workspace_id,id));
create table public.messages(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,conversation_id uuid not null,direction text not null check(direction in ('inbound','outbound')),body text not null,status text not null default 'draft',provider_id text,created_at timestamptz not null default now(),foreign key(workspace_id,conversation_id) references public.conversations(workspace_id,id));
create unique index messages_provider_dedupe on public.messages(workspace_id,provider_id) where provider_id is not null;
create table public.activity_events(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid,kind text not null,payload jsonb not null default '{}',created_at timestamptz not null default now(),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id));
create table public.sending_windows(workspace_id uuid not null references public.workspaces,channel text not null check(channel in ('whatsapp','email','voice')),weekday integer not null check(weekday between 0 and 6),start_time time not null,end_time time not null,enabled boolean not null default false,check(start_time<end_time),primary key(workspace_id,channel,weekday));
create table public.voice_agents(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,name text not null,language text not null check(language in ('en','hi')),instructions text not null,knowledge text not null default '',max_duration_seconds integer not null default 300 check(max_duration_seconds between 30 and 900),max_concurrency integer not null default 1 check(max_concurrency between 1 and 20),status text not null default 'draft',unique(workspace_id,id));
create table public.calls(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid not null,agent_id uuid not null,provider_id text unique,status text not null default 'pending',duration_seconds integer not null default 0,transcript text,recording_key text,created_at timestamptz not null default now(),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id),foreign key(workspace_id,agent_id) references public.voice_agents(workspace_id,id));
create table public.wallets(workspace_id uuid primary key references public.workspaces,balance bigint not null default 0 check(balance>=0),reserved bigint not null default 0 check(reserved>=0 and reserved<=balance));
create table public.credit_rates(id uuid primary key default gen_random_uuid(),channel text not null,unit text not null,rate_microcredits bigint not null check(rate_microcredits>0),effective_at timestamptz not null,approved boolean not null default false);
create table public.credit_reservations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,idempotency_key text not null,amount bigint not null check(amount>0),settled_amount bigint,status text not null default 'reserved' check(status in ('reserved','settled','released')),created_at timestamptz not null default now(),unique(workspace_id,idempotency_key));
create table public.credit_ledger(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,kind text not null check(kind in ('purchase','reserve','usage','release','refund','adjustment')),amount bigint not null,reference text not null,created_at timestamptz not null default now(),unique(workspace_id,kind,reference));
create table public.payments(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,provider_order_id text unique,provider_payment_id text unique,amount_paise bigint not null check(amount_paise>0),credits bigint not null check(credits>0),status text not null default 'created',created_at timestamptz not null default now());
create table public.subscriptions(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,provider_id text unique,plan_code text not null,status text not null default 'pending',current_period_end timestamptz);
create table public.audit_events(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,actor_id uuid references auth.users,action text not null,resource_id text,created_at timestamptz not null default now());
create table public.outbox(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,contact_id uuid,kind text not null,payload jsonb not null,idempotency_key text not null,status text not null default 'pending' check(status in ('pending','queued','processing','completed','failed','uncertain','cancelled')),available_at timestamptz not null default now(),attempts integer not null default 0,created_at timestamptz not null default now(),unique(workspace_id,idempotency_key),foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id));
create index outbox_pending on public.outbox(available_at) where status='pending';
create table public.provider_events(id uuid primary key default gen_random_uuid(),provider text not null,event_id text not null,payload jsonb not null,processed_at timestamptz,created_at timestamptz not null default now(),unique(provider,event_id));
create table public.oauth_states(state_hash text primary key,workspace_id uuid not null references public.workspaces,user_id uuid not null references auth.users,provider text not null,expires_at timestamptz not null,code_verifier text not null);
-- Explicit policies: operational and billing writes are server-only.
do $$ declare t text; begin
foreach t in array array['workspaces','memberships','contacts','deals','tasks','integrations','integration_secrets','templates','campaigns','sequences','enrollments','conversations','messages','activity_events','sending_windows','voice_agents','calls','wallets','credit_rates','credit_reservations','credit_ledger','payments','subscriptions','audit_events','outbox','provider_events','oauth_states'] loop
execute format('alter table public.%I enable row level security',t);
end loop;
foreach t in array array['workspaces','memberships','contacts','deals','tasks','integrations','templates','campaigns','sequences','enrollments','conversations','messages','activity_events','sending_windows','voice_agents','calls','wallets','credit_reservations','credit_ledger','payments','subscriptions','audit_events'] loop
execute format('create policy tenant_read on public.%I for select to authenticated using(public.is_member(%s))',t,case when t='workspaces' then 'id' else 'workspace_id' end);
end loop;
end $$;
-- Writes go through authenticated server routes; no browser table mutations.
create function public.create_workspace(workspace_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare w uuid; begin
if auth.uid() is null then raise exception 'authentication_required'; end if;
if exists(select 1 from memberships where user_id=auth.uid()) then raise exception 'workspace_already_exists'; end if;
insert into workspaces(name) values(workspace_name) returning id into w;
insert into memberships values(w,auth.uid(),'owner');insert into wallets(workspace_id) values(w);return w;
end $$;
create function public.reserve_credits(w uuid,amount_requested bigint,request_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare r credit_reservations; available bigint; begin
if amount_requested<=0 then raise exception 'invalid_amount';end if;
perform 1 from wallets where workspace_id=w for update;
select * into r from credit_reservations where workspace_id=w and idempotency_key=request_key;
if found then if r.amount<>amount_requested then raise exception 'idempotency_conflict';end if;return r.id;end if;
select balance-reserved into available from wallets where workspace_id=w;
if available is null or available<amount_requested then raise exception 'insufficient_credits';end if;
insert into credit_reservations(workspace_id,idempotency_key,amount) values(w,request_key,amount_requested) returning * into r;
update wallets set reserved=reserved+amount_requested where workspace_id=w;
insert into credit_ledger(workspace_id,kind,amount,reference) values(w,'reserve',amount_requested,r.id::text);return r.id;
end $$;
create function public.settle_credits(reservation_id uuid,actual bigint) returns void language plpgsql security definer set search_path=public as $$
declare r credit_reservations; begin
-- Wallet then reservation lock order matches reserve_credits.
select * into r from credit_reservations where id=reservation_id;
if not found then raise exception 'reservation_not_found';end if;
perform 1 from wallets where workspace_id=r.workspace_id for update;
select * into r from credit_reservations where id=reservation_id for update;
if r.status<>'reserved' then if r.settled_amount is distinct from actual then raise exception 'settlement_conflict';end if;return;end if;
if actual<0 or actual>r.amount then raise exception 'invalid_settlement';end if;
update wallets set balance=balance-actual,reserved=reserved-r.amount where workspace_id=r.workspace_id;
update credit_reservations set status=case when actual=0 then 'released' else 'settled' end,settled_amount=actual where id=r.id;
insert into credit_ledger(workspace_id,kind,amount,reference) values(r.workspace_id,'usage',-actual,r.id::text);
if actual<r.amount then insert into credit_ledger(workspace_id,kind,amount,reference) values(r.workspace_id,'release',r.amount-actual,r.id::text);end if;
end $$;
create function public.capture_payment(order_id text,payment_id text,paid_paise bigint) returns void language plpgsql security definer set search_path=public as $$
declare p payments; begin
select * into p from payments where provider_order_id=order_id for update;
if not found then raise exception 'unknown_order';end if;
if p.amount_paise<>paid_paise then raise exception 'amount_mismatch';end if;
if p.status='captured' then if p.provider_payment_id<>payment_id then raise exception 'payment_conflict';end if;return;end if;
if p.status<>'created' then raise exception 'invalid_payment_state';end if;
update wallets set balance=balance+p.credits where workspace_id=p.workspace_id;
update payments set status='captured',provider_payment_id=payment_id where id=p.id;
insert into credit_ledger(workspace_id,kind,amount,reference) values(p.workspace_id,'purchase',p.credits,payment_id);
end $$;
create function public.stop_contact_outreach() returns trigger language plpgsql security definer set search_path=public as $$
begin
if new.direction='inbound' then
update enrollments set status='replied',next_run_at=null where workspace_id=new.workspace_id and contact_id=(select contact_id from conversations where id=new.conversation_id) and status='active';
update outbox set status='cancelled' where workspace_id=new.workspace_id and contact_id=(select contact_id from conversations where id=new.conversation_id) and status in ('pending','queued');
end if;return new;end $$;
create trigger inbound_stops_outreach after insert on public.messages for each row execute function public.stop_contact_outreach();
create function public.prevent_ledger_change() returns trigger language plpgsql as $$begin raise exception 'immutable_ledger';end $$;
create trigger immutable_ledger before update or delete on public.credit_ledger for each row execute function public.prevent_ledger_change();
revoke execute on function public.reserve_credits(uuid,bigint,text),public.settle_credits(uuid,bigint),public.capture_payment(text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_credits(uuid,bigint,text),public.settle_credits(uuid,bigint),public.capture_payment(text,text,bigint) to service_role;
revoke execute on function public.create_workspace(text) from public,anon;
grant execute on function public.create_workspace(text) to authenticated;
alter publication supabase_realtime add table public.messages,public.conversations;
