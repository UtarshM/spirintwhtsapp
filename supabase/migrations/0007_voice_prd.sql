-- PRD voice configuration, trusted handoff summaries and durable call analysis.
alter table public.voice_agents add column tts_provider text not null default 'cartesia' check(tts_provider in ('sarvam','cartesia'));
alter table public.voice_agents add column speaker text not null default 'shubh' check(speaker in ('shubh','aditya','ritu','priya','neha','rahul','pooja','rohan','simran','kavya'));
alter table public.voice_agents add column speech_pace numeric not null default 1 check(speech_pace between 0.5 and 2);
alter table public.voice_agents add column qualification_questions jsonb not null default '[]' check(jsonb_typeof(qualification_questions)='array' and jsonb_array_length(qualification_questions)<=10);
create function public.voice_questions_valid(items jsonb) returns boolean language sql immutable set search_path=public as $$
select case when items is null or jsonb_typeof(items)<>'array' then false else jsonb_array_length(items)<=10 and not exists(select 1 from jsonb_array_elements(items) item where jsonb_typeof(item)<>'string' or length(item#>>'{}') not between 5 and 240) end
$$;
alter table public.voice_agents add constraint voice_questions_valid check(public.voice_questions_valid(qualification_questions));
revoke execute on function public.voice_questions_valid(jsonb) from public,anon,authenticated;
grant execute on function public.voice_questions_valid(jsonb) to service_role;
alter table public.voice_agents add column end_call_rules text not null default '' check(length(end_call_rules)<=2000);
alter table public.voice_agents add constraint voice_provider_pace check(tts_provider='sarvam' or speech_pace=1);
alter table public.voice_agents add column transfer_mode text not null default 'warm' check(transfer_mode in ('warm','cold'));
alter table public.calls add column handoff_summary text check(length(handoff_summary) between 1 and 1200);
alter table public.calls add column handoff_token_hash text check(handoff_token_hash ~ '^[a-f0-9]{64}$');
alter table public.calls add column handoff_expires_at timestamptz;
alter table public.calls add column ai_summary text check(length(ai_summary) between 1 and 1200);
alter table public.calls add column ai_outcome text check(ai_outcome in ('interested','not_interested','call_back','wrong_number','no_answer','unclassified'));
alter table public.calls add column qualification_answers jsonb not null default '[]';
alter table public.calls add column analysis_status text not null default 'not_requested' check(analysis_status in ('not_requested','pending','processing','complete','failed'));
alter table public.calls add unique(workspace_id,id);
create table public.voice_analysis_jobs (
  call_id uuid primary key, workspace_id uuid not null,
  status text not null default 'pending' check(status in ('pending','processing','complete','failed')),
  attempts integer not null default 0 check(attempts between 0 and 5),
  lease_token uuid, lease_until timestamptz, next_run_at timestamptz not null default now(), last_error text,
  foreign key(workspace_id,call_id) references public.calls(workspace_id,id)
);
alter table public.voice_analysis_jobs enable row level security;
revoke all on public.voice_analysis_jobs from public,anon,authenticated,service_role;
grant select on public.voice_analysis_jobs to service_role;
create index voice_analysis_due on public.voice_analysis_jobs(next_run_at) where status in ('pending','processing');

create function public.queue_voice_analysis() returns trigger language plpgsql security definer set search_path=public as $$
begin
if old.ended_at is null and new.ended_at is not null and new.request_key is not null then
  new.analysis_status:='pending';
  insert into voice_analysis_jobs(call_id,workspace_id) values(new.id,new.workspace_id) on conflict do nothing;
end if;
return new;
end $$;
create trigger queue_voice_analysis before update on public.calls for each row execute function public.queue_voice_analysis();

create function public.claim_voice_analyses(batch_size integer default 10) returns setof public.voice_analysis_jobs
language plpgsql security definer set search_path=public as $$
declare job voice_analysis_jobs;
begin
if batch_size not between 1 and 20 then raise exception 'invalid_analysis_batch'; end if;
-- An exhausted crashed lease becomes visible as failed rather than disappearing.
update voice_analysis_jobs set status='failed',last_error='analysis_attempts_exhausted',lease_token=null,lease_until=null where status='processing' and lease_until<now() and attempts>=5;
update calls c set analysis_status='failed' from voice_analysis_jobs j where c.id=j.call_id and j.status='failed' and c.analysis_status<>'failed';
for job in select * from voice_analysis_jobs where attempts<5 and exists(select 1 from voice_settings cfg where cfg.workspace_id=voice_analysis_jobs.workspace_id and cfg.enabled) and exists(select 1 from integration_acceptances accepted where accepted.workspace_id=voice_analysis_jobs.workspace_id and accepted.channel='voice' and accepted.expires_at>now()) and ((status='pending' and next_run_at<=now()) or (status='processing' and lease_until<now())) order by next_run_at,call_id for update skip locked limit batch_size loop
  update voice_analysis_jobs set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where call_id=job.call_id returning * into job;
  update calls set analysis_status='processing' where id=job.call_id;
  return next job;
end loop;
end $$;

create function public.complete_voice_analysis(call_id uuid,lease uuid,result jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare job voice_analysis_jobs; ca calls; item jsonb; question_index integer:=0;
begin
select * into job from voice_analysis_jobs j where j.call_id=complete_voice_analysis.call_id for update;
if not found or job.status<>'processing' or job.lease_token is distinct from lease or job.lease_until<now() then raise exception 'analysis_lease_lost'; end if;
select * into ca from calls where id=job.call_id and workspace_id=job.workspace_id for update;
if not found or ca.ended_at is null then raise exception 'call_not_finished'; end if;
if result is null or jsonb_typeof(result)<>'object' or result-'summary'-'outcome'-'answers'<>'{}'::jsonb or jsonb_typeof(result->'summary') is distinct from 'string' or length(result->>'summary') not between 1 and 1200 or (result->>'outcome') is null or (result->>'outcome') not in ('interested','not_interested','call_back','wrong_number','no_answer','unclassified') or jsonb_typeof(result->'answers') is distinct from 'array' then raise exception 'invalid_call_analysis'; end if;
if jsonb_array_length(result->'answers')>10 or jsonb_array_length(result->'answers')<>jsonb_array_length(coalesce(ca.agent_snapshot->'qualification_questions','[]'::jsonb)) then raise exception 'invalid_call_analysis'; end if;
for item in select value from jsonb_array_elements(result->'answers') loop
  if jsonb_typeof(item)<>'object' or item-'question'-'answer'<>'{}'::jsonb or jsonb_typeof(item->'question') is distinct from 'string' or length(item->>'question') not between 1 and 240 or not(item ? 'answer') or jsonb_typeof(item->'answer') not in ('string','null') or length(item->>'answer')>600 then raise exception 'invalid_call_analysis'; end if;
  if item->>'question' is distinct from ca.agent_snapshot->'qualification_questions'->>question_index then raise exception 'invalid_call_analysis'; end if;
  question_index:=question_index+1;
end loop;
if result->>'outcome' in ('interested','not_interested','call_back','wrong_number') and not exists(select 1 from call_turns where call_turns.call_id=ca.id and workspace_id=ca.workspace_id and role='user') then raise exception 'invalid_call_analysis'; end if;
update calls set ai_summary=result->>'summary',ai_outcome=result->>'outcome',qualification_answers=result->'answers',analysis_status='complete' where id=job.call_id;
update voice_analysis_jobs j set status='complete',lease_token=null,lease_until=null,last_error=null where j.call_id=job.call_id;
insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'voice.analyzed',jsonb_build_object('callId',ca.id,'outcome',result->>'outcome'),'voice:analysis:'||ca.id::text) on conflict do nothing;
if result->>'outcome'='interested' and exists(select 1 from contacts where id=ca.contact_id and workspace_id=ca.workspace_id and consent and opted_out_at is null) then
  insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'lead.hot',jsonb_build_object('callId',ca.id,'summary',result->>'summary','source','ai_call_analysis'),'voice:hot:'||ca.id::text) on conflict do nothing;
end if;
end $$;

create function public.fail_voice_analysis(call_id uuid,lease uuid) returns void
language plpgsql security definer set search_path=public as $$
declare job voice_analysis_jobs;
begin
select * into job from voice_analysis_jobs j where j.call_id=fail_voice_analysis.call_id for update;
if not found or job.status<>'processing' or job.lease_token is distinct from lease or job.lease_until<now() then raise exception 'analysis_lease_lost'; end if;
update voice_analysis_jobs j set status=case when job.attempts>=5 then 'failed' else 'pending' end,next_run_at=now()+make_interval(secs=>least(1800,60*power(2,job.attempts-1)::integer)),lease_token=null,lease_until=null,last_error='call_analysis_failed' where j.call_id=job.call_id;
update calls set analysis_status=case when job.attempts>=5 then 'failed' else 'pending' end where id=job.call_id;
end $$;

-- Real caller speech is a reply: stop other pending steps immediately.
create function public.voice_reply_stops_outreach() returns trigger language plpgsql security definer set search_path=public as $$
declare ca calls;
begin
select * into ca from calls where id=new.call_id and workspace_id=new.workspace_id;
if ca.id is null then raise exception 'voice_turn_workspace_mismatch'; end if;
if new.role='user' then
  update enrollments set status='replied',next_run_at=null where workspace_id=ca.workspace_id and contact_id=ca.contact_id and status='active';
  update outbox set status='cancelled' where workspace_id=ca.workspace_id and contact_id=ca.contact_id and status in ('pending','queued');
  insert into activity_events(workspace_id,contact_id,kind,payload,source_key) values(ca.workspace_id,ca.contact_id,'voice.reply',jsonb_build_object('callId',ca.id),'voice:reply:'||ca.id::text) on conflict do nothing;
end if;
return new;
end $$;
create trigger voice_reply_stops_outreach after insert on public.call_turns for each row execute function public.voice_reply_stops_outreach();

revoke execute on function public.queue_voice_analysis(),public.claim_voice_analyses(integer),public.complete_voice_analysis(uuid,uuid,jsonb),public.fail_voice_analysis(uuid,uuid),public.voice_reply_stops_outreach() from public,anon,authenticated;
grant execute on function public.claim_voice_analyses(integer),public.complete_voice_analysis(uuid,uuid,jsonb),public.fail_voice_analysis(uuid,uuid) to service_role;

-- The speech/handoff contract changed; old acceptance cannot approve this version.
update public.voice_settings set enabled=false;
delete from public.integration_acceptances where channel='voice';
