-- LaunchGuild v1: normalized collections, service-only writes, member-isolated reads.
create table public.programs(id text primary key, owner_id uuid not null references auth.users(id), version integer not null default 1, name text not null, mode text not null check(mode='live'), demo_start date not null, strategy jsonb not null, capacity jsonb not null);
create table public.memberships(program_id text references public.programs on delete cascade, user_id uuid references auth.users, role text not null check(role in ('owner','editor','viewer')), primary key(program_id,user_id));
create table public.mutation_receipts(program_id text references public.programs on delete cascade, key text not null, version integer not null, primary key(program_id,key));
create or replace function public.can_read(p_id text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from memberships where program_id=p_id and user_id=auth.uid()); $$;
alter table public.programs enable row level security;
alter table public.memberships enable row level security;
alter table public.mutation_receipts enable row level security;
create policy program_read on public.programs for select to authenticated using(public.can_read(id));
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid());
create policy receipt_read on public.mutation_receipts for select to authenticated using(public.can_read(program_id));
create table public.partners(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index partners_partner_idx on public.partners(program_id,partner_id);
alter table public.partners enable row level security;
create policy partners_read on public.partners for select to authenticated using(public.can_read(program_id));
create table public.work(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index work_partner_idx on public.work(program_id,partner_id);
alter table public.work enable row level security;
create policy work_read on public.work for select to authenticated using(public.can_read(program_id));
create table public.sources(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index sources_partner_idx on public.sources(program_id,partner_id);
alter table public.sources enable row level security;
create policy sources_read on public.sources for select to authenticated using(public.can_read(program_id));
create table public.requests(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index requests_partner_idx on public.requests(program_id,partner_id);
alter table public.requests enable row level security;
create policy requests_read on public.requests for select to authenticated using(public.can_read(program_id));
create table public.promises(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index promises_partner_idx on public.promises(program_id,partner_id);
alter table public.promises enable row level security;
create policy promises_read on public.promises for select to authenticated using(public.can_read(program_id));
create table public.agreements(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index agreements_partner_idx on public.agreements(program_id,partner_id);
alter table public.agreements enable row level security;
create policy agreements_read on public.agreements for select to authenticated using(public.can_read(program_id));
create table public.observations(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index observations_partner_idx on public.observations(program_id,partner_id);
alter table public.observations enable row level security;
create policy observations_read on public.observations for select to authenticated using(public.can_read(program_id));
create table public.scenarios(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index scenarios_partner_idx on public.scenarios(program_id,partner_id);
alter table public.scenarios enable row level security;
create policy scenarios_read on public.scenarios for select to authenticated using(public.can_read(program_id));
create table public.decisions(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index decisions_partner_idx on public.decisions(program_id,partner_id);
alter table public.decisions enable row level security;
create policy decisions_read on public.decisions for select to authenticated using(public.can_read(program_id));
create table public.runs(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index runs_partner_idx on public.runs(program_id,partner_id);
alter table public.runs enable row level security;
create policy runs_read on public.runs for select to authenticated using(public.can_read(program_id));
create table public.proposals(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index proposals_partner_idx on public.proposals(program_id,partner_id);
alter table public.proposals enable row level security;
create policy proposals_read on public.proposals for select to authenticated using(public.can_read(program_id));
create table public.reviews(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index reviews_partner_idx on public.reviews(program_id,partner_id);
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select to authenticated using(public.can_read(program_id));
create table public.history(program_id text not null references public.programs on delete cascade, id text not null, version integer not null default 1, partner_id text, payload jsonb not null check(jsonb_typeof(payload)='object'), primary key(program_id,id));
create index history_partner_idx on public.history(program_id,partner_id);
alter table public.history enable row level security;
create policy history_read on public.history for select to authenticated using(public.can_read(program_id));
create or replace function public.read_program(p_id text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p programs; result jsonb;
begin
 if auth.uid() is null or not public.can_read(p_id) then return null; end if;
 select * into p from programs where id=p_id;
 if not found then return null; end if;
 result=jsonb_build_object('schema','launchguild-v1','id',p.id,'mode',p.mode,'version',p.version,'name',p.name,'demoStart',p.demo_start,'strategy',p.strategy,'capacity',p.capacity,'appliedKeys',(select coalesce(jsonb_agg(key),'[]') from mutation_receipts where program_id=p_id));
result=result||jsonb_build_object('partners',(select coalesce(jsonb_agg(payload order by version,id),'[]') from partners where program_id=p_id));
result=result||jsonb_build_object('work',(select coalesce(jsonb_agg(payload order by version,id),'[]') from work where program_id=p_id));
result=result||jsonb_build_object('sources',(select coalesce(jsonb_agg(payload order by version,id),'[]') from sources where program_id=p_id));
result=result||jsonb_build_object('requests',(select coalesce(jsonb_agg(payload order by version,id),'[]') from requests where program_id=p_id));
result=result||jsonb_build_object('promises',(select coalesce(jsonb_agg(payload order by version,id),'[]') from promises where program_id=p_id));
result=result||jsonb_build_object('agreements',(select coalesce(jsonb_agg(payload order by version,id),'[]') from agreements where program_id=p_id));
result=result||jsonb_build_object('observations',(select coalesce(jsonb_agg(payload order by version,id),'[]') from observations where program_id=p_id));
result=result||jsonb_build_object('scenarios',(select coalesce(jsonb_agg(payload order by version,id),'[]') from scenarios where program_id=p_id));
result=result||jsonb_build_object('decisions',(select coalesce(jsonb_agg(payload order by version,id),'[]') from decisions where program_id=p_id));
result=result||jsonb_build_object('runs',(select coalesce(jsonb_agg(payload order by version,id),'[]') from runs where program_id=p_id));
result=result||jsonb_build_object('proposals',(select coalesce(jsonb_agg(payload order by version,id),'[]') from proposals where program_id=p_id));
result=result||jsonb_build_object('reviews',(select coalesce(jsonb_agg(payload order by version,id),'[]') from reviews where program_id=p_id));
result=result||jsonb_build_object('history',(select coalesce(jsonb_agg(payload order by version,id),'[]') from history where program_id=p_id));
return result; end; $$;
-- Only the verified server can invoke these functions; RLS has no client mutation policies.
create or replace function public.create_program(p_state jsonb,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 if p_state->>'mode'<>'live' or p_state->>'id'<>p_actor::text then raise exception 'invalid program owner'; end if;
 insert into programs(id,owner_id,version,name,mode,demo_start,strategy,capacity) values(p_state->>'id',p_actor,1,p_state->>'name','live',(p_state->>'demoStart')::date,p_state->'strategy',p_state->'capacity');
 insert into memberships values(p_state->>'id',p_actor,'owner');
end; $$;
revoke all on function public.create_program(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_program(jsonb,uuid) to service_role;
create or replace function public.commit_program(p_id text,p_expected integer,p_key text,p_state jsonb,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$
declare p programs; item jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select * into p from programs where id=p_id for update;
 if not exists(select 1 from memberships where program_id=p_id and user_id=p_actor and role in ('owner','editor')) then raise exception 'write permission denied'; end if;
 if exists(select 1 from mutation_receipts where program_id=p_id and key=p_key) then return; end if;
 if p.version<>p_expected then raise exception 'version conflict'; end if;
 if p_state->>'id'<>p_id or p_state->>'mode'<>'live' then raise exception 'scope mismatch'; end if;
 update programs set version=(p_state->>'version')::integer,name=p_state->>'name',strategy=p_state->'strategy',capacity=p_state->'capacity' where id=p_id;
for item in select value from jsonb_array_elements(p_state->'partners') loop
 insert into partners(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'work') loop
 insert into work(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'sources') loop
 insert into sources(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'requests') loop
 insert into requests(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'promises') loop
 insert into promises(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'agreements') loop
 insert into agreements(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'observations') loop
 insert into observations(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'scenarios') loop
 insert into scenarios(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'decisions') loop
 insert into decisions(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'runs') loop
 insert into runs(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'proposals') loop
 insert into proposals(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'reviews') loop
 insert into reviews(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
for item in select value from jsonb_array_elements(p_state->'history') loop
 insert into history(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item)
 on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
 end loop;
insert into mutation_receipts values(p_id,p_key,(p_state->>'version')::integer);
end; $$;
revoke all on function public.commit_program(text,integer,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.commit_program(text,integer,text,jsonb,uuid) to service_role;
-- Reserved token ceilings are admission budgets, not provider bills.
create table public.usage_reservations(id uuid primary key,program_id text references programs on delete cascade,actor uuid not null,day date not null default current_date,tokens integer not null,state text not null default 'reserved',expires_at timestamptz not null default now()+interval '5 minutes');
alter table public.usage_reservations enable row level security;
create policy usage_read on usage_reservations for select to authenticated using(public.can_read(program_id));
create or replace function public.reserve_usage(p_id uuid,p_program text,p_actor uuid,p_tokens integer) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 perform 1 from programs where id=p_program for update;
 if not exists(select 1 from memberships where program_id=p_program and user_id=p_actor and role in ('owner','editor')) then raise exception 'permission denied'; end if;
 if exists(select 1 from usage_reservations where id=p_id) then return; end if;
 if (select count(*) from usage_reservations where program_id=p_program and state='reserved' and expires_at>now())>=3 then raise exception 'three concurrent calls already admitted'; end if;
 if p_tokens<=0 or p_tokens>20000 or (select coalesce(sum(tokens),0) from usage_reservations where program_id=p_program and day=current_date)+p_tokens>200000 then raise exception 'daily token reservation ceiling reached'; end if;
 insert into usage_reservations(id,program_id,actor,tokens) values(p_id,p_program,p_actor,p_tokens);
end; $$;
revoke all on function public.reserve_usage(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_usage(uuid,text,uuid,integer) to service_role;
-- Private uploads remain disabled until a storage adapter has scoped policies and verified receipts.
