-- Voice execution data is separate from the planning document. Server-only writes.
create table public.integration_acceptances (
  workspace_id uuid not null references public.workspaces,
  channel text not null check(channel in ('voice','whatsapp','email','checkout')),
  evidence text not null check(length(evidence) between 10 and 1000),
  accepted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key(workspace_id,channel), check(expires_at>accepted_at)
);
create table public.voice_settings (
  workspace_id uuid primary key references public.workspaces,
  caller_id text not null check(caller_id ~ '^\+[1-9][0-9]{7,14}$'),
  transfer_number text check(transfer_number ~ '^\+[1-9][0-9]{7,14}$'),
  allowed_destinations text[] not null default '{}',
  max_concurrency integer not null default 1 check(max_concurrency between 1 and 20),
  enabled boolean not null default false
);
alter table public.voice_agents add column greeting text not null default 'Hello, I am your AI assistant. How can I help you today?';
alter table public.voice_agents add constraint voice_greeting_length check(length(greeting) between 10 and 350);
alter table public.calls add column request_key uuid;
alter table public.calls add column request_uuid text;
alter table public.calls add column reservation_id uuid references public.credit_reservations;
alter table public.calls add column rate_microcredits bigint;
alter table public.calls add column agent_snapshot jsonb;
alter table public.calls add column destination text;
alter table public.calls add column caller_id text;
alter table public.calls add column transfer_number text;
alter table public.calls add column session_hash text;
alter table public.calls add column session_expires_at timestamptz;
alter table public.calls add column stream_claimed_at timestamptz;
alter table public.calls add column started_at timestamptz;
alter table public.calls add column ended_at timestamptz;
alter table public.calls add column last_error text;
alter table public.calls add column outcome text;
alter table public.calls add column stop_requested_at timestamptz;
alter table public.calls add column reconciliation_state text not null default 'pending' check(reconciliation_state in ('pending','manual','settled'));
alter table public.calls add column reconcile_after timestamptz not null default now();
alter table public.calls add column reconcile_attempts integer not null default 0 check(reconcile_attempts>=0);
create unique index calls_request_key on public.calls(workspace_id,request_key) where request_key is not null;
create index calls_active_voice on public.calls(workspace_id,agent_id) where ended_at is null and request_key is not null;
create index calls_reconcile_due on public.calls(reconcile_after,created_at) where ended_at is null and request_key is not null and reconciliation_state='pending';
create table public.call_turns (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
  call_id uuid not null references public.calls, turn_key uuid not null,
  role text not null check(role in ('user','assistant','system')),
  content text not null check(length(content) between 1 and 2000),
  interrupted boolean not null default false, created_at timestamptz not null default now(),
  unique(call_id,turn_key)
);
-- Session hashes/snapshots remain server-only; members read a whitelisted API response.
revoke select on public.calls from authenticated,anon;
drop policy tenant_read on public.calls;
do $$ declare t text; begin
foreach t in array array['integration_acceptances','voice_settings','call_turns'] loop
execute format('alter table public.%I enable row level security',t);
end loop; end $$;
create policy tenant_read on public.call_turns for select to authenticated using(public.is_member(workspace_id));

create function public.prepare_voice_call(w uuid,actor uuid,a uuid,c uuid,k uuid,secret_hash text)
returns public.calls language plpgsql security definer set search_path=public as $$
declare ag voice_agents; co contacts; cfg voice_settings; existing calls; result calls;
rate bigint; reservation uuid; local_now timestamp; tz text; active_count integer;
begin
-- Workspace lock serializes idempotency, concurrency checks, opt-out dispatch and reservation.
perform pg_advisory_xact_lock(hashtextextended(w::text,47));
if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'administrator_required'; end if;
select * into existing from calls where workspace_id=w and request_key=k;
if found then
  if existing.agent_id<>a or existing.contact_id<>c then raise exception 'idempotency_conflict'; end if;
  return existing;
end if;
if secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_session'; end if;
if not exists(select 1 from integration_acceptances where workspace_id=w and channel='voice' and expires_at>now()) then raise exception 'voice_acceptance_required'; end if;
select * into cfg from voice_settings where workspace_id=w and enabled;
if not found then raise exception 'voice_settings_required'; end if;
select * into ag from voice_agents where workspace_id=w and id=a and status='ready';
if not found then raise exception 'agent_not_ready'; end if;
select * into co from contacts where workspace_id=w and id=c for update;
if not found or not co.consent or co.opted_out_at is not null then raise exception 'contact_not_callable'; end if;
if co.phone is null or co.phone !~ '^\+[1-9][0-9]{7,14}$' or not(co.phone=any(cfg.allowed_destinations)) then raise exception 'destination_not_allowed'; end if;
select timezone into tz from workspaces where id=w;
local_now:=now() at time zone tz;
if not exists(select 1 from sending_windows where workspace_id=w and channel='voice' and enabled and weekday=extract(dow from local_now)::integer and local_now::time>=start_time and local_now::time<end_time) then raise exception 'outside_calling_window'; end if;
select count(*) into active_count from calls where workspace_id=w and request_key is not null and ended_at is null;
if active_count>=cfg.max_concurrency then raise exception 'workspace_call_limit'; end if;
select count(*) into active_count from calls where workspace_id=w and agent_id=a and request_key is not null and ended_at is null;
if active_count>=ag.max_concurrency then raise exception 'agent_call_limit'; end if;
select rate_microcredits into rate from credit_rates where channel='voice' and unit='minute' and approved and effective_at<=now() order by effective_at desc,id desc limit 1;
if rate is null then raise exception 'approved_voice_rate_required'; end if;
reservation:=reserve_credits(w,ceil(ag.max_duration_seconds/60.0)::bigint*rate,'voice:'||k::text);
insert into calls(workspace_id,contact_id,agent_id,request_key,status,reservation_id,rate_microcredits,agent_snapshot,destination,caller_id,transfer_number,session_hash,session_expires_at)
values(w,c,a,k,'initiating',reservation,rate,to_jsonb(ag),co.phone,cfg.caller_id,cfg.transfer_number,secret_hash,now()+interval '2 minutes') returning * into result;
insert into audit_events(workspace_id,actor_id,action,resource_id) values(w,actor,'voice.call.requested',result.id::text);
return result;
end $$;

create function public.bind_voice_call(call_id uuid,secret_hash text,provider_uuid text,request_id text)
returns public.calls language plpgsql security definer set search_path=public as $$
declare ca calls; begin
select * into ca from calls where id=call_id for update;
if not found or ca.session_hash is distinct from secret_hash or ca.ended_at is not null or ca.stop_requested_at is not null or ca.session_expires_at<now() then raise exception 'invalid_voice_session'; end if;
if ca.provider_id is not null and ca.provider_id<>provider_uuid then raise exception 'call_binding_conflict'; end if;
if ca.request_uuid is not null and ca.request_uuid<>request_id then raise exception 'request_binding_conflict'; end if;
if not exists(select 1 from contacts where id=ca.contact_id and workspace_id=ca.workspace_id and consent and opted_out_at is null) then raise exception 'contact_not_callable'; end if;
update calls set provider_id=provider_uuid,request_uuid=request_id,status='answered',started_at=coalesce(started_at,now()) where id=call_id returning * into ca;
return ca;
end $$;

create function public.claim_voice_stream(call_id uuid,secret_hash text)
returns public.calls language plpgsql security definer set search_path=public as $$
declare ca calls; begin
select * into ca from calls where id=call_id for update;
if not found or ca.session_hash is distinct from secret_hash or ca.stream_claimed_at is not null or ca.ended_at is not null or ca.stop_requested_at is not null or ca.session_expires_at<now() or ca.provider_id is null then raise exception 'invalid_voice_session'; end if;
if not exists(select 1 from contacts where id=ca.contact_id and workspace_id=ca.workspace_id and consent and opted_out_at is null) then raise exception 'contact_not_callable'; end if;
update calls set stream_claimed_at=now(),status='in_progress' where id=call_id returning * into ca;
return ca;
end $$;

create function public.finish_voice_call(call_id uuid,provider_uuid text,billed_seconds integer,final_status text)
returns void language plpgsql security definer set search_path=public as $$
declare ca calls; actual bigint; max_seconds integer; begin
select * into ca from calls where id=call_id for update;
if not found or ca.provider_id is distinct from provider_uuid or ca.reservation_id is null then raise exception 'call_binding_conflict'; end if;
if billed_seconds<0 or final_status not in ('completed','failed','busy','no-answer','cancel') then raise exception 'invalid_call_completion'; end if;
if ca.ended_at is not null then
  if ca.duration_seconds<>billed_seconds then raise exception 'call_duration_conflict'; end if;
  return;
end if;
max_seconds:=(ca.agent_snapshot->>'max_duration_seconds')::integer;
actual:=ceil(billed_seconds/60.0)::bigint*ca.rate_microcredits;
-- Unexpected provider duration keeps credits reserved for operator reconciliation.
if billed_seconds>max_seconds+5 or actual>(select amount from credit_reservations where id=ca.reservation_id) then raise exception 'call_duration_exceeded'; end if;
perform settle_credits(ca.reservation_id,actual);
update calls set status=final_status,duration_seconds=billed_seconds,ended_at=now(),session_hash=null,reconciliation_state='settled',
transcript=(select string_agg(role||': '||content, E'\n' order by created_at,id) from call_turns where call_turns.call_id=ca.id) where id=ca.id;
insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'voice.completed',jsonb_build_object('callId',ca.id,'status',final_status,'seconds',billed_seconds),'voice:'||ca.id::text) on conflict do nothing;
end $$;

create function public.reject_voice_call(call_id uuid,safe_code text)
returns void language plpgsql security definer set search_path=public as $$
declare ca calls; begin
select * into ca from calls where id=call_id for update;
if not found or ca.status not in ('initiating','stop_requested') or ca.provider_id is not null or ca.request_uuid is not null then raise exception 'call_not_rejectable'; end if;
perform settle_credits(ca.reservation_id,0);
update calls set status='failed',ended_at=now(),last_error=safe_code,session_hash=null,reconciliation_state='settled' where id=call_id;
end $$;

create function public.request_voice_stop(w uuid,actor uuid,call_id uuid)
returns public.calls language plpgsql security definer set search_path=public as $$
declare ca calls; begin
if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'administrator_required'; end if;
select * into ca from calls where id=call_id and workspace_id=w for update;
if not found then raise exception 'call_not_found'; end if;
if ca.ended_at is not null then return ca; end if;
update calls set stop_requested_at=coalesce(stop_requested_at,now()),status='stop_requested' where id=call_id returning * into ca;
insert into audit_events(workspace_id,actor_id,action,resource_id) values(w,actor,'voice.call.stop_requested',call_id::text);
return ca;
end $$;

create function public.voice_opt_out(call_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare ca calls; begin
select * into ca from calls where id=call_id;
if not found or ca.ended_at is not null then raise exception 'call_not_active'; end if;
update contacts set consent=false,opted_out_at=coalesce(opted_out_at,now()) where workspace_id=ca.workspace_id and id=ca.contact_id;
update calls set outcome='opted_out' where id=ca.id;
insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'voice.opt_out',jsonb_build_object('callId',ca.id),'voice:optout:'||ca.id::text) on conflict do nothing;
end $$;

revoke execute on function public.prepare_voice_call(uuid,uuid,uuid,uuid,uuid,text),public.bind_voice_call(uuid,text,text,text),public.claim_voice_stream(uuid,text),public.finish_voice_call(uuid,text,integer,text),public.reject_voice_call(uuid,text),public.voice_opt_out(uuid),public.request_voice_stop(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_voice_call(uuid,uuid,uuid,uuid,uuid,text),public.bind_voice_call(uuid,text,text,text),public.claim_voice_stream(uuid,text),public.finish_voice_call(uuid,text,integer,text),public.reject_voice_call(uuid,text),public.voice_opt_out(uuid),public.request_voice_stop(uuid,uuid,uuid) to service_role;
