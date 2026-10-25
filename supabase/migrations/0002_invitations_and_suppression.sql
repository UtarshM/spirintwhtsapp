create table public.invitations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,email text not null,role public.workspace_role not null check(role<>'owner'),token_hash text not null unique,expires_at timestamptz not null,accepted_at timestamptz,created_by uuid references auth.users,created_at timestamptz not null default now());
alter table public.invitations enable row level security;
create policy admin_read on public.invitations for select to authenticated using(public.is_admin(workspace_id));
create function public.accept_invitation(invite_token_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare i invitations; user_email text;begin
if auth.uid() is null then raise exception 'authentication_required';end if;
select email into user_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
select * into i from invitations where token_hash=invite_token_hash and lower(email)=lower(user_email) and accepted_at is null and expires_at>now() for update;
if not found then raise exception 'invalid_invitation';end if;
if exists(select 1 from memberships where user_id=auth.uid() and workspace_id<>i.workspace_id) then raise exception 'workspace_already_exists';end if;
insert into memberships(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),i.role) on conflict do nothing;
update invitations set accepted_at=now() where id=i.id;
insert into audit_events(workspace_id,actor_id,action,resource_id) values(i.workspace_id,auth.uid(),'invitation.accept',i.id::text);
return i.workspace_id;
end $$;
revoke execute on function public.accept_invitation(text) from public,anon;
grant execute on function public.accept_invitation(text) to authenticated;
create function public.suppress_opted_out_contact() returns trigger language plpgsql security definer set search_path=public as $$begin
if new.opted_out_at is not null or not new.consent then
update enrollments set status='opted_out',next_run_at=null where workspace_id=new.workspace_id and contact_id=new.id and status='active';
update outbox set status='cancelled' where workspace_id=new.workspace_id and contact_id=new.id and status in ('pending','queued');
end if;return new;end $$;
create trigger contact_suppresses_outreach after update of consent,opted_out_at on public.contacts for each row execute function public.suppress_opted_out_contact();
