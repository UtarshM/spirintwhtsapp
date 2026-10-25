-- Provider events are durable, normalized atomically, and never grant opt-in.
create unique index integrations_meta_number_unique on public.integrations(external_id) where provider='meta' and external_id is not null;
alter table public.provider_events add column attempts integer not null default 0, add column last_error text, add column next_attempt_at timestamptz not null default now(), add column processing_notes jsonb not null default '{}';
alter table public.conversations add column last_inbound_at timestamptz;
alter table public.messages add column message_type text, add column media_reference jsonb, add column provider_status_at timestamptz;
alter table public.activity_events add column source_key text;
create unique index activity_source_dedupe on public.activity_events(workspace_id,source_key) where source_key is not null;
create table public.meta_message_receipts (
  workspace_id uuid not null references public.workspaces on delete cascade,
  source_key text not null,
  provider_id text not null,
  recipient_phone text not null,
  status text not null check(status in ('sent','delivered','read','failed')),
  occurred_at timestamptz not null,
  error_code text,
  primary key(workspace_id,source_key)
);
create index meta_receipts_message on public.meta_message_receipts(workspace_id,provider_id);
alter table public.meta_message_receipts enable row level security;
create policy tenant_read on public.meta_message_receipts for select to authenticated using(public.is_member(workspace_id));
grant select on public.meta_message_receipts to authenticated;
grant all on public.meta_message_receipts to service_role;

create function public.apply_meta_receipts(w uuid, pid text) returns void language plpgsql security definer set search_path=public as $$
declare m messages; c conversations; person contacts; receipt meta_message_receipts; best meta_message_receipts;
begin
  select * into m from messages where workspace_id=w and provider_id=pid and direction='outbound' for update;
  if not found then return; end if;
  select * into c from conversations where workspace_id=w and id=m.conversation_id and channel='whatsapp';
  if not found then return; end if;
  select * into person from contacts where workspace_id=w and id=c.contact_id;
  for receipt in select * from meta_message_receipts where workspace_id=w and provider_id=pid and recipient_phone=person.phone loop
    insert into activity_events(workspace_id,contact_id,kind,payload,source_key,created_at)
    values(w,c.contact_id,'whatsapp.status',jsonb_build_object('message_id',m.id,'status',receipt.status,'error_code',receipt.error_code),receipt.source_key,receipt.occurred_at)
    on conflict(workspace_id,source_key) where source_key is not null do nothing;
  end loop;
  select * into best from meta_message_receipts where workspace_id=w and provider_id=pid and recipient_phone=person.phone
    order by case status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 else 1 end desc,occurred_at desc limit 1;
  if found then
    -- A late sent/failed event must not replace a confirmed delivered/read state.
    if (case best.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 else 1 end) >=
       (case m.status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 when 'sent' then 1 else 0 end) then
      update messages set status=best.status,provider_status_at=best.occurred_at where id=m.id;
    end if;
  end if;
end $$;
create function public.reconcile_meta_message_receipts() returns trigger language plpgsql security definer set search_path=public as $$begin
  if new.direction='outbound' and new.provider_id is not null then perform apply_meta_receipts(new.workspace_id,new.provider_id);end if;return new;
end $$;
create trigger reconcile_meta_receipts after insert or update of provider_id on public.messages for each row execute function public.reconcile_meta_message_receipts();

create function public.normalize_meta_event(event_uuid uuid, actions jsonb, ignored_fields jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare e provider_events; a jsonb; integration integrations; person contacts; c conversations; existing messages; inserted_id uuid; source text; received integer:=0; receipts integer:=0; at_time timestamptz;
begin
  select * into e from provider_events where id=event_uuid and provider='meta' for update;
  if not found then raise exception 'meta_event_not_found';end if;
  if e.processed_at is not null then return jsonb_build_object('duplicate',true);end if;
  if jsonb_typeof(actions)<>'array' or jsonb_array_length(actions)>2000 or jsonb_typeof(ignored_fields)<>'array' then raise exception 'meta_invalid_actions';end if;
  for a in select * from jsonb_array_elements(actions) loop
    select * into integration from integrations where provider='meta' and external_id=a->>'phoneNumberId' and status='connected';
    if not found then raise exception 'meta_unmapped_number';end if;
    if integration.metadata ? 'waba_id' and integration.metadata->>'waba_id' <> a->>'wabaId' then raise exception 'meta_account_mismatch';end if;
    if a->>'phone' !~ '^\+[1-9][0-9]{7,14}$' or length(a->>'providerId') not between 1 and 512 then raise exception 'meta_invalid_identity';end if;
    at_time := (a->>'at')::timestamptz;
    -- Serialize all events for a workspace/contact, including first contact creation.
    perform pg_advisory_xact_lock(hashtextextended(integration.workspace_id::text || ':whatsapp:' || (a->>'phone'),0));
    if a->>'kind'='inbound' then
      insert into contacts(workspace_id,name,phone,consent) values(integration.workspace_id,coalesce(nullif(a->>'profileName',''),a->>'phone'),a->>'phone',false)
        on conflict(workspace_id,phone) where phone is not null do update set phone=excluded.phone returning * into person;
      select * into existing from messages where workspace_id=integration.workspace_id and provider_id=a->>'providerId';
      if found then
        if existing.direction<>'inbound' or not exists(select 1 from conversations where id=existing.conversation_id and workspace_id=integration.workspace_id and contact_id=person.id and channel='whatsapp') then raise exception 'meta_message_identity_conflict';end if;
        continue;
      end if;
      select * into c from conversations where workspace_id=integration.workspace_id and contact_id=person.id and channel='whatsapp' order by created_at,id limit 1 for update;
      if not found then insert into conversations(workspace_id,contact_id,channel) values(integration.workspace_id,person.id,'whatsapp') returning * into c;end if;
      insert into messages(workspace_id,conversation_id,direction,body,status,provider_id,created_at,message_type,media_reference)
        values(integration.workspace_id,c.id,'inbound',coalesce(a->>'body',''), 'received',a->>'providerId',at_time,a->>'messageType',a->'media') returning id into inserted_id;
      update conversations set status='open',last_inbound_at=greatest(coalesce(last_inbound_at,at_time),at_time) where id=c.id;
      insert into activity_events(workspace_id,contact_id,kind,payload,source_key,created_at) values(integration.workspace_id,person.id,'whatsapp.inbound',jsonb_build_object('message_id',inserted_id,'conversation_id',c.id,'message_type',a->>'messageType'),'meta:inbound:'||(a->>'providerId'),at_time)
        on conflict(workspace_id,source_key) where source_key is not null do nothing;
      received:=received+1;
    elsif a->>'kind'='status' then
      source:='meta:status:'||encode(sha256(convert_to((a->>'providerId')||':'||(a->>'status')||':'||(a->>'at')||':'||coalesce(a->>'errorCode',''),'UTF8')),'hex');
      insert into meta_message_receipts(workspace_id,source_key,provider_id,recipient_phone,status,occurred_at,error_code) values(integration.workspace_id,source,a->>'providerId',a->>'phone',a->>'status',at_time,a->>'errorCode') on conflict do nothing;
      perform apply_meta_receipts(integration.workspace_id,a->>'providerId');
      receipts:=receipts+1;
    else raise exception 'meta_invalid_action';end if;
  end loop;
  update provider_events set processed_at=now(),last_error=null,attempts=attempts+1,processing_notes=jsonb_build_object('inbound',received,'receipts',receipts,'ignored_fields',ignored_fields) where id=e.id;
  return jsonb_build_object('inbound',received,'receipts',receipts);
end $$;
create function public.fail_meta_event(event_uuid uuid, failure_code text) returns void language sql security definer set search_path=public as $$
  update provider_events set attempts=attempts+1,last_error=left(failure_code,80),next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7)))::integer) where id=event_uuid and provider='meta' and processed_at is null;
$$;
revoke execute on function public.apply_meta_receipts(uuid,text),public.reconcile_meta_message_receipts(),public.normalize_meta_event(uuid,jsonb,jsonb),public.fail_meta_event(uuid,text) from public,anon,authenticated;
grant execute on function public.normalize_meta_event(uuid,jsonb,jsonb),public.fail_meta_event(uuid,text) to service_role;

create function public.manage_provider_conversation(w uuid,conversation_uuid uuid,actor uuid,assignee uuid,next_status text) returns void language plpgsql security definer set search_path=public as $$
declare c conversations; actor_role workspace_role;
begin
  select role into actor_role from memberships where workspace_id=w and user_id=actor;
  if not found then raise exception 'conversation_access_denied';end if;
  select * into c from conversations where workspace_id=w and id=conversation_uuid and channel='whatsapp' for update;
  if not found then raise exception 'conversation_access_denied';end if;
  if next_status not in ('open','closed') then raise exception 'invalid_status';end if;
  if assignee is not null and not exists(select 1 from memberships where workspace_id=w and user_id=assignee) then raise exception 'conversation_access_denied';end if;
  if actor_role='agent' and (c.assigned_to is not null and c.assigned_to<>actor or assignee is distinct from actor and (c.assigned_to is distinct from actor or assignee is not null)) then raise exception 'conversation_access_denied';end if;
  update conversations set assigned_to=assignee,status=next_status where id=c.id;
  if assignee is not null and c.assigned_to is distinct from assignee then
    update enrollments set status='handoff',next_run_at=null where workspace_id=w and contact_id=c.contact_id and status='active';
    update outbox set status='cancelled' where workspace_id=w and contact_id=c.contact_id and status in ('pending','queued');
    insert into activity_events(workspace_id,contact_id,kind,payload) values(w,c.contact_id,'human.handoff',jsonb_build_object('conversation_id',c.id,'assigned_to',assignee));
  end if;
  insert into audit_events(workspace_id,actor_id,action,resource_id) values(w,actor,'conversation.manage',c.id::text);
end $$;
revoke execute on function public.manage_provider_conversation(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_provider_conversation(uuid,uuid,uuid,uuid,text) to service_role;
