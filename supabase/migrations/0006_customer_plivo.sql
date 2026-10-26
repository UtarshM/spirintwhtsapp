-- Customers own their Plivo account. Tokens are KMS ciphertext with a connection-
-- specific encryption context, never browser-readable configuration.
create table public.plivo_connections (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces,
  auth_id text not null check(auth_id ~ '^[A-Za-z0-9]{6,100}$'),
  ciphertext text check(length(ciphertext) between 16 and 32000),
  status text not null check(status in ('connected','disconnected')),
  last_verified_at timestamptz not null,
  phone_numbers jsonb not null,
  created_at timestamptz not null default now(),
  unique(workspace_id,id),
  check((status='connected' and ciphertext is not null) or (status='disconnected' and ciphertext is null))
);
create unique index plivo_one_connected_workspace on public.plivo_connections(workspace_id) where status='connected';
create unique index plivo_one_connected_auth_id on public.plivo_connections(auth_id) where status='connected';
alter table public.plivo_connections enable row level security;
revoke all on public.plivo_connections from public,anon,authenticated,service_role;
grant select on public.plivo_connections to service_role;
alter table public.voice_settings add column plivo_connection_id uuid;
alter table public.voice_settings add foreign key(workspace_id,plivo_connection_id) references public.plivo_connections(workspace_id,id);
alter table public.calls add column plivo_connection_id uuid;
alter table public.calls add foreign key(workspace_id,plivo_connection_id) references public.plivo_connections(workspace_id,id);

-- An old platform account acceptance cannot authorize a customer's new account.
update public.voice_settings set enabled=false;
delete from public.integration_acceptances where channel='voice';
delete from public.integration_secrets where integration_id in (select id from public.integrations where provider='plivo');
update public.integrations set status='not_connected',external_id=null,metadata='{"connectionMode":"customer"}' where provider='plivo';

create function public.plivo_numbers_valid(numbers jsonb) returns boolean
language plpgsql immutable set search_path=public as $$
declare item jsonb; seen text[] := '{}'; n text;
begin
if numbers is null or jsonb_typeof(numbers)<>'array' then return false; end if;
if jsonb_array_length(numbers) not between 1 and 100 then return false; end if;
for item in select value from jsonb_array_elements(numbers) loop
  if jsonb_typeof(item)<>'object' or item-'number'-'label'<>'{}'::jsonb or jsonb_typeof(item->'number') is distinct from 'string' then return false; end if;
  n:=item->>'number';
  if n !~ '^\+[1-9][0-9]{7,14}$' or n=any(seen) then return false; end if;
  if item ? 'label' and (jsonb_typeof(item->'label') is distinct from 'string' or length(item->>'label')>120) then return false; end if;
  seen:=array_append(seen,n);
end loop;
return true;
end $$;
alter table public.plivo_connections add constraint plivo_verified_numbers_valid check(public.plivo_numbers_valid(phone_numbers));

create function public.connect_plivo_account(w uuid,actor uuid,connection_id uuid,auth_id text,encrypted_token text,numbers jsonb,selected_caller text)
returns uuid language plpgsql security definer set search_path=public as $$
begin
perform pg_advisory_xact_lock(hashtextextended(w::text,47));
if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'administrator_required'; end if;
if connection_id is null or auth_id is null or auth_id !~ '^[A-Za-z0-9]{6,100}$' or encrypted_token is null or length(encrypted_token) not between 16 and 32000 or not plivo_numbers_valid(numbers) then raise exception 'plivo_connection_invalid'; end if;
if selected_caller is null or not exists(select 1 from jsonb_array_elements(numbers) n where n->>'number'=selected_caller) then raise exception 'plivo_caller_not_owned'; end if;
if exists(select 1 from calls where workspace_id=w and request_key is not null and ended_at is null) then raise exception 'plivo_calls_active'; end if;
-- Serialize the global customer-account ownership rule as well as workspace rotation.
perform pg_advisory_xact_lock(hashtextextended(auth_id,48));
if exists(select 1 from plivo_connections p where p.auth_id=connect_plivo_account.auth_id and p.status='connected' and p.workspace_id<>w) then raise exception 'plivo_auth_already_connected'; end if;
if exists(select 1 from plivo_connections p where p.id=connection_id) then raise exception 'plivo_connection_changed'; end if;
update plivo_connections set status='disconnected',ciphertext=null where workspace_id=w and status='connected';
insert into plivo_connections(id,workspace_id,auth_id,ciphertext,status,last_verified_at,phone_numbers)
values(connection_id,w,auth_id,encrypted_token,'connected',now(),numbers);
insert into voice_settings(workspace_id,caller_id,plivo_connection_id,enabled)
values(w,selected_caller,connection_id,false)
on conflict(workspace_id) do update set caller_id=excluded.caller_id,plivo_connection_id=excluded.plivo_connection_id,enabled=false;
delete from integration_acceptances where workspace_id=w and channel='voice';
insert into integrations(workspace_id,provider,status,external_id,metadata)
values(w,'plivo','connected',auth_id,jsonb_build_object('connectionMode','customer','connectionId',connection_id,'verifiedPhoneCount',jsonb_array_length(numbers)))
on conflict(workspace_id,provider) do update set status=excluded.status,external_id=excluded.external_id,metadata=excluded.metadata;
insert into audit_events(workspace_id,actor_id,action,resource_id) values(w,actor,'plivo.account.connected',connection_id::text);
return connection_id;
end $$;

create function public.update_plivo_settings(w uuid,actor uuid,connection_id uuid,caller text,transfer text,numbers jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare cfg voice_settings; changed boolean;
begin
perform pg_advisory_xact_lock(hashtextextended(w::text,47));
if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'administrator_required'; end if;
select * into cfg from voice_settings where workspace_id=w;
if connection_id is null or cfg.plivo_connection_id is distinct from connection_id or not exists(select 1 from plivo_connections p where p.workspace_id=w and p.id=connection_id and p.status='connected') then raise exception 'plivo_connection_changed'; end if;
if exists(select 1 from calls where workspace_id=w and request_key is not null and ended_at is null) then raise exception 'plivo_calls_active'; end if;
if not plivo_numbers_valid(numbers) then raise exception 'plivo_connection_invalid'; end if;
if caller is null or not exists(select 1 from jsonb_array_elements(numbers) n where n->>'number'=caller) then raise exception 'plivo_caller_not_owned'; end if;
if transfer is not null and transfer !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_transfer_number'; end if;
changed:=cfg.caller_id is distinct from caller or cfg.transfer_number is distinct from transfer;
update plivo_connections set phone_numbers=numbers,last_verified_at=now() where workspace_id=w and id=connection_id;
update voice_settings set caller_id=caller,transfer_number=transfer,enabled=case when changed then false else enabled end where workspace_id=w;
if changed then delete from integration_acceptances where workspace_id=w and channel='voice'; end if;
update integrations set metadata=jsonb_build_object('connectionMode','customer','connectionId',connection_id,'verifiedPhoneCount',jsonb_array_length(numbers)) where workspace_id=w and provider='plivo';
insert into audit_events(workspace_id,actor_id,action,resource_id) values(w,actor,'plivo.settings.updated',connection_id::text);
end $$;

create function public.disconnect_plivo_account(w uuid,actor uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
perform pg_advisory_xact_lock(hashtextextended(w::text,47));
if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'administrator_required'; end if;
if exists(select 1 from calls where workspace_id=w and request_key is not null and ended_at is null) then raise exception 'plivo_calls_active'; end if;
update plivo_connections set status='disconnected',ciphertext=null where workspace_id=w;
update voice_settings set plivo_connection_id=null,enabled=false where workspace_id=w;
delete from integration_acceptances where workspace_id=w and channel='voice';
update integrations set status='not_connected',external_id=null,metadata='{"connectionMode":"customer"}' where workspace_id=w and provider='plivo';
insert into audit_events(workspace_id,actor_id,action) values(w,actor,'plivo.account.disconnected');
end $$;

create function public.guard_voice_call_connection() returns trigger
language plpgsql security definer set search_path=public as $$
declare cfg voice_settings; conn plivo_connections;
begin
if tg_op='UPDATE' then
  if (old.request_key is not null or new.request_key is not null) and (new.workspace_id is distinct from old.workspace_id or new.plivo_connection_id is distinct from old.plivo_connection_id or new.request_key is distinct from old.request_key) then raise exception 'immutable_call_connection'; end if;
  return new;
end if;
if new.request_key is null then return new; end if;
perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text,47));
select * into cfg from voice_settings where workspace_id=new.workspace_id;
select * into conn from plivo_connections where workspace_id=new.workspace_id and id=cfg.plivo_connection_id and status='connected';
if conn.id is null then raise exception 'plivo_connection_required'; end if;
if new.plivo_connection_id is not null and new.plivo_connection_id<>conn.id then raise exception 'plivo_connection_changed'; end if;
if new.caller_id is distinct from cfg.caller_id or not exists(select 1 from jsonb_array_elements(conn.phone_numbers) n where n->>'number'=new.caller_id) then raise exception 'plivo_caller_not_owned'; end if;
new.plivo_connection_id:=conn.id;
return new;
end $$;
create trigger voice_call_connection before insert or update on public.calls for each row execute function public.guard_voice_call_connection();

revoke execute on function public.plivo_numbers_valid(jsonb),public.guard_voice_call_connection(),public.connect_plivo_account(uuid,uuid,uuid,text,text,jsonb,text),public.update_plivo_settings(uuid,uuid,uuid,text,text,jsonb),public.disconnect_plivo_account(uuid,uuid) from public,anon,authenticated;
grant execute on function public.connect_plivo_account(uuid,uuid,uuid,text,text,jsonb,text),public.update_plivo_settings(uuid,uuid,uuid,text,text,jsonb),public.disconnect_plivo_account(uuid,uuid) to service_role;

-- Platform AI usage is measured by the runtime, independently of a customer's
-- Plivo account/signing token. A lost runtime leaves the reservation held.
alter table public.calls add column ai_runtime_seconds integer not null default 0 check(ai_runtime_seconds>=0);
alter table public.calls add column runtime_usage_finalized boolean not null default false;
create function public.record_voice_runtime_end(call_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare ca calls; elapsed integer;
begin
select * into ca from calls where id=call_id for update;
if not found or ca.request_key is null then raise exception 'call_binding_conflict'; end if;
if ca.runtime_usage_finalized then return; end if;
if ca.ended_at is not null then raise exception 'call_already_settled'; end if;
elapsed:=case when ca.stream_claimed_at is null then 0 else
least((ca.agent_snapshot->>'max_duration_seconds')::integer,
greatest(1,ceil(extract(epoch from clock_timestamp()-ca.stream_claimed_at))::integer)) end;
update calls set ai_runtime_seconds=elapsed,runtime_usage_finalized=true where id=call_id;
end $$;

create or replace function public.finish_voice_call(call_id uuid,provider_uuid text,billed_seconds integer,final_status text)
returns void language plpgsql security definer set search_path=public as $$
declare ca calls; actual bigint; max_seconds integer; begin
select * into ca from calls where id=call_id for update;
if not found or ca.provider_id is distinct from provider_uuid or ca.reservation_id is null then raise exception 'call_binding_conflict'; end if;
if billed_seconds is null or billed_seconds<0 or final_status is null or final_status not in ('completed','failed','busy','no-answer','cancel') then raise exception 'invalid_call_completion'; end if;
if ca.ended_at is not null then
  if ca.duration_seconds is distinct from billed_seconds or ca.status is distinct from final_status then raise exception 'call_duration_conflict'; end if;
  return;
end if;
max_seconds:=(ca.agent_snapshot->>'max_duration_seconds')::integer;
if billed_seconds>max_seconds+5 then raise exception 'call_duration_exceeded'; end if;
if ca.stream_claimed_at is not null and not ca.runtime_usage_finalized then raise exception 'voice_runtime_usage_pending'; end if;
actual:=ceil(ca.ai_runtime_seconds/60.0)::bigint*ca.rate_microcredits;
if actual>(select amount from credit_reservations where id=ca.reservation_id) then raise exception 'call_duration_exceeded'; end if;
perform settle_credits(ca.reservation_id,actual);
update calls set status=final_status,duration_seconds=billed_seconds,ended_at=now(),session_hash=null,reconciliation_state='settled',runtime_usage_finalized=true,
transcript=(select string_agg(role||': '||content, E'\n' order by created_at,id) from call_turns where call_turns.call_id=ca.id) where id=ca.id;
insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'voice.completed',jsonb_build_object('callId',ca.id,'status',final_status,'seconds',billed_seconds,'aiSeconds',ca.ai_runtime_seconds),'voice:'||ca.id::text) on conflict do nothing;
end $$;
revoke execute on function public.record_voice_runtime_end(uuid) from public,anon,authenticated;
grant execute on function public.record_voice_runtime_end(uuid) to service_role;
