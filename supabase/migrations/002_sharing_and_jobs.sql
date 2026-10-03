create table public.share_links(token_hash text primary key,program_id text not null references public.programs on delete cascade,payload jsonb not null,expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now());
alter table public.share_links enable row level security;
create policy shares_owner_read on public.share_links for select to authenticated using(exists(select 1 from memberships where program_id=share_links.program_id and user_id=auth.uid() and role='owner'));
create table public.job_inputs(id uuid primary key,program_id text not null references public.programs on delete cascade,actor uuid not null,input jsonb not null,role text not null,input_hash text not null,status text not null default 'queued',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.job_inputs enable row level security;
create policy job_read on public.job_inputs for select to authenticated using(public.can_read(program_id));
create table public.job_events(sequence bigint generated always as identity primary key,job_id uuid not null references public.job_inputs on delete cascade,program_id text not null references public.programs on delete cascade,status text not null,summary text not null,created_at timestamptz not null default now());
alter table public.job_events enable row level security;
create policy job_events_read on public.job_events for select to authenticated using(public.can_read(program_id));
create table public.invitations(id uuid primary key,program_id text not null references public.programs on delete cascade,invited_email text not null,role text not null check(role in('editor','viewer')),token_hash text unique not null,expires_at timestamptz not null,accepted_at timestamptz,created_by uuid not null references auth.users);
alter table public.invitations enable row level security;
create policy invitations_owner_read on public.invitations for select to authenticated using(exists(select 1 from memberships where program_id=invitations.program_id and user_id=auth.uid() and role='owner'));
create or replace function public.accept_invitation(p_hash text,p_user uuid,p_email text) returns text language plpgsql security definer set search_path=public as $$
declare invite invitations;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select * into invite from invitations where token_hash=p_hash for update;
 if not found or invite.expires_at<now() or invite.accepted_at is not null or lower(invite.invited_email)<>lower(p_email) then raise exception 'Invitation expired, used, or addressed to another verified account'; end if;
 insert into memberships(program_id,user_id,role) values(invite.program_id,p_user,invite.role) on conflict do nothing;
 update invitations set accepted_at=now() where id=invite.id;
 return invite.program_id;
end; $$;
revoke all on function public.accept_invitation(text,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_invitation(text,uuid,text) to service_role;
