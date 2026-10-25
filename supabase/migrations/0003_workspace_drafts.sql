-- Shared planning documents only. These records never enqueue provider work,
-- change real membership, mint wallet credits, or create payment records.
create table public.workspace_drafts (
  workspace_id uuid primary key references public.workspaces on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and state ? 'version' and state->>'version' = '1' and octet_length(state::text) <= 10000000),
  revision bigint not null check (revision > 0),
  updated_by uuid not null references auth.users,
  updated_at timestamptz not null default now()
);
alter table public.workspace_drafts enable row level security;
create policy tenant_read on public.workspace_drafts for select to authenticated using (public.is_member(workspace_id));
grant select on public.workspace_drafts to authenticated;
grant all on public.workspace_drafts to service_role;

create function public.save_workspace_draft(w uuid, actor uuid, expected_revision bigint, draft_state jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare current_revision bigint;
begin
  if not exists(select 1 from memberships where workspace_id=w and user_id=actor and role in ('owner','administrator')) then raise exception 'draft_access_denied'; end if;
  if expected_revision < 0 then raise exception 'invalid_revision'; end if;
  -- Serialize first writes as well as edits; stale tabs cannot overwrite changes.
  perform 1 from workspaces where id=w for update;
  select revision into current_revision from workspace_drafts where workspace_id=w;
  if coalesce(current_revision,0) <> expected_revision then raise exception 'draft_revision_conflict'; end if;
  insert into workspace_drafts(workspace_id,state,revision,updated_by) values(w,draft_state,expected_revision+1,actor)
    on conflict(workspace_id) do update set state=excluded.state,revision=excluded.revision,updated_by=actor,updated_at=now();
  return expected_revision+1;
end $$;
revoke execute on function public.save_workspace_draft(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_workspace_draft(uuid,uuid,bigint,jsonb) to service_role;
