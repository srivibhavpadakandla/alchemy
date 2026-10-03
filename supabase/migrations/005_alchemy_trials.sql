create table public.trial_reports(program_id text not null references programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null,primary key(program_id,id));
alter table public.trial_reports enable row level security;
create policy trial_reports_read on public.trial_reports for select to authenticated using(public.can_read(program_id));
create table public.trial_events(program_id text not null references programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null,primary key(program_id,id));
alter table public.trial_events enable row level security;
create policy trial_events_read on public.trial_events for select to authenticated using(public.can_read(program_id));
-- Alchemy trial records. Existing identifiers remain compatible with stored programs.
create table public.trial_plans(program_id text not null references public.programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null check(jsonb_typeof(payload)='object'),primary key(program_id,id));
alter table public.trial_plans enable row level security;
create policy trial_plans_read on public.trial_plans for select to authenticated using(public.can_read(program_id));
create table public.trial_tasks(program_id text not null references public.programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null check(jsonb_typeof(payload)='object'),primary key(program_id,id));
alter table public.trial_tasks enable row level security;
create policy trial_tasks_read on public.trial_tasks for select to authenticated using(public.can_read(program_id));
create table public.trial_measurements(program_id text not null references public.programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null check(jsonb_typeof(payload)='object'),primary key(program_id,id));
alter table public.trial_measurements enable row level security;
create policy trial_measurements_read on public.trial_measurements for select to authenticated using(public.can_read(program_id));
create table public.trial_decisions(program_id text not null references public.programs on delete cascade,id text not null,version integer not null default 1,partner_id text not null,payload jsonb not null check(jsonb_typeof(payload)='object'),primary key(program_id,id));
alter table public.trial_decisions enable row level security;
create policy trial_decisions_read on public.trial_decisions for select to authenticated using(public.can_read(program_id));
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
result=result||jsonb_build_object('trialPlans',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_plans where program_id=p_id));
result=result||jsonb_build_object('trialTasks',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_tasks where program_id=p_id));
result=result||jsonb_build_object('trialMeasurements',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_measurements where program_id=p_id));
result=result||jsonb_build_object('trialDecisions',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_decisions where program_id=p_id));
result=result||jsonb_build_object('trialEvents',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_events where program_id=p_id));
result=result||jsonb_build_object('trialReports',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_reports where program_id=p_id));
return result; end; $$;
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
for item in select value from jsonb_array_elements(coalesce(p_state->'trialPlans','[]')) loop
 insert into trial_plans(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
end loop;
for item in select value from jsonb_array_elements(coalesce(p_state->'trialTasks','[]')) loop
 insert into trial_tasks(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
end loop;
for item in select value from jsonb_array_elements(coalesce(p_state->'trialMeasurements','[]')) loop
 insert into trial_measurements(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
end loop;
for item in select value from jsonb_array_elements(coalesce(p_state->'trialDecisions','[]')) loop
 insert into trial_decisions(program_id,id,version,partner_id,payload) values(p_id,item->>'id',coalesce((item->>'version')::integer,1),item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload,version=excluded.version,partner_id=excluded.partner_id;
end loop;
for item in select value from jsonb_array_elements(coalesce(p_state->'trialEvents','[]')) loop
 insert into trial_events(program_id,id,version,partner_id,payload) values(p_id,item->>'id',1,item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload;
end loop;
for item in select value from jsonb_array_elements(coalesce(p_state->'trialReports','[]')) loop
 insert into trial_reports(program_id,id,version,partner_id,payload) values(p_id,item->>'id',1,item->>'partnerId',item) on conflict(program_id,id) do update set payload=excluded.payload;
end loop;
insert into mutation_receipts values(p_id,p_key,(p_state->>'version')::integer);
end; $$;
revoke all on function public.commit_program(text,integer,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.commit_program(text,integer,text,jsonb,uuid) to service_role;

create or replace function public.immutable_trial_record() returns trigger language plpgsql as $$ begin if new.payload is distinct from old.payload then raise exception 'immutable evidence or plan version'; end if; return new; end; $$;
create trigger trial_plans_immutable before update on public.trial_plans for each row execute function public.immutable_trial_record();
create trigger trial_measurements_immutable before update on public.trial_measurements for each row execute function public.immutable_trial_record();
create trigger trial_decisions_immutable before update on public.trial_decisions for each row execute function public.immutable_trial_record();
create trigger history_immutable before update on public.history for each row execute function public.immutable_trial_record();
alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check check(role in ('owner','editor','viewer','customer'));
alter table public.memberships add column partner_id text;
alter table public.memberships add constraint customer_scope check((role='customer')=(partner_id is not null));
alter table public.invitations drop constraint invitations_role_check;
alter table public.invitations add constraint invitations_role_check check(role in('editor','viewer','customer'));
alter table public.invitations add column partner_id text;
alter table public.invitations add constraint invitation_customer_scope check((role='customer')=(partner_id is not null));
create or replace function public.can_read(p_id text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from memberships where program_id=p_id and user_id=auth.uid() and role in('owner','editor','viewer')); $$;
create or replace function public.accept_invitation(p_hash text,p_user uuid,p_email text) returns text language plpgsql security definer set search_path=public as $$
declare invite invitations;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select * into invite from invitations where token_hash=p_hash for update;
 if not found or invite.expires_at<now() or invite.accepted_at is not null or lower(invite.invited_email)<>lower(p_email) then raise exception 'Invitation expired, used, or addressed to another verified account'; end if;
 if invite.role='customer' and not exists(select 1 from partners where program_id=invite.program_id and id=invite.partner_id) then raise exception 'Customer no longer exists'; end if;
 if exists(select 1 from memberships where program_id=invite.program_id and user_id=p_user and role='customer' and partner_id<>invite.partner_id) then raise exception 'Account already scoped to a different customer'; end if;
 insert into memberships(program_id,user_id,role,partner_id) values(invite.program_id,p_user,invite.role,invite.partner_id) on conflict do nothing;
 update invitations set accepted_at=now() where id=invite.id;
 return invite.program_id;
end; $$;
revoke all on function public.accept_invitation(text,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_invitation(text,uuid,text) to service_role;

create or replace function public.read_trial(p_program text,p_partner text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from memberships where program_id=p_program and user_id=auth.uid() and (role in('owner','editor') or role='customer' and partner_id=p_partner)) then return null; end if;
 if not exists(select 1 from partners where program_id=p_program and id=p_partner) then return null; end if;
 result=jsonb_build_object('programId',p_program,'programVersion',(select version from programs where id=p_program),'customer',(select jsonb_build_object('id',id,'name',payload->>'name') from partners where program_id=p_program and id=p_partner));
 result=result||jsonb_build_object('plans',(select coalesce(jsonb_agg(payload order by version,id),'[]') from trial_plans where program_id=p_program and partner_id=p_partner));
 result=result||jsonb_build_object('tasks',(select coalesce(jsonb_agg(payload order by id),'[]') from trial_tasks where program_id=p_program and partner_id=p_partner));
 result=result||jsonb_build_object('measurements',(select coalesce(jsonb_agg(payload order by id),'[]') from trial_measurements where program_id=p_program and partner_id=p_partner));
 result=result||jsonb_build_object('decisions',(select coalesce(jsonb_agg(payload order by id),'[]') from trial_decisions where program_id=p_program and partner_id=p_partner));
 result=result||jsonb_build_object('sources',(select coalesce(jsonb_agg(payload order by id),'[]') from sources where program_id=p_program and partner_id=p_partner and id in (
 select payload->>'needsSourceId' from trial_plans where program_id=p_program and partner_id=p_partner union
 select payload#>>'{metric,baselineSourceId}' from trial_plans where program_id=p_program and partner_id=p_partner union
 select payload->>'founderApprovalSourceId' from trial_plans where program_id=p_program and partner_id=p_partner union
 select payload->>'customerApprovalSourceId' from trial_plans where program_id=p_program and partner_id=p_partner union
 select payload->>'completionSourceId' from trial_tasks where program_id=p_program and partner_id=p_partner union
 select payload->>'sourceId' from trial_measurements where program_id=p_program and partner_id=p_partner union
 select payload->>'sourceId' from trial_decisions where program_id=p_program and partner_id=p_partner)));
 result=result||jsonb_build_object('trialEvents',(select coalesce(jsonb_agg(payload order by id),'[]') from trial_events where program_id=p_program and partner_id=p_partner));
 result=result||jsonb_build_object('trialReports',(select coalesce(jsonb_agg(payload order by id),'[]') from trial_reports where program_id=p_program and partner_id=p_partner));
 return result;
end; $$;
revoke all on function public.read_trial(text,text) from public,anon;
grant execute on function public.read_trial(text,text) to authenticated;

create or replace function public.acknowledge_trial(p_program text,p_partner text,p_plan text,p_expected integer,p_actor uuid,p_source jsonb,p_key text) returns void language plpgsql security definer set search_path=public as $$
declare plan jsonb; next_plan jsonb; pv integer;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select version into pv from programs where id=p_program for update;
 if not exists(select 1 from memberships where program_id=p_program and user_id=p_actor and role='customer' and partner_id=p_partner) then raise exception 'customer permission denied'; end if;
 if exists(select 1 from mutation_receipts where program_id=p_program and key=p_key) then return; end if;
 if pv<>p_expected then raise exception 'version conflict'; end if;
 select payload into plan from trial_plans where program_id=p_program and partner_id=p_partner order by version desc,id desc limit 1;
 if plan is null or plan->>'id'<>p_plan then raise exception 'Plan changed; review the latest version'; end if;
 if p_source->>'partnerId'<>p_partner or p_source->>'kind'<>'direct acknowledgment' or p_source->>'author'<>p_actor::text then raise exception 'acknowledgment scope mismatch'; end if;
 if coalesce(plan->>'customerApprovalSourceId','')<>'' then raise exception 'This plan already has customer acknowledgment'; end if;
 next_plan=plan||jsonb_build_object('id',p_key,'previousId',p_plan,'version',(plan->>'version')::integer+1,'customerApprovalSourceId',p_source->>'id','createdAt',now());
 insert into sources(program_id,id,version,partner_id,payload) values(p_program,p_source->>'id',1,p_partner,p_source);
 insert into trial_plans(program_id,id,version,partner_id,payload) values(p_program,p_key,(next_plan->>'version')::integer,p_partner,next_plan);
 insert into trial_tasks(program_id,id,version,partner_id,payload) values(p_program,'action-'||p_key,1,p_partner,jsonb_build_object('id','action-'||p_key,'trialId',plan->>'trialId','partnerId',p_partner,'planVersion',(next_plan->>'version')::integer,'version',1,'title',case when coalesce(plan->>'founderApprovalSourceId','')='' then 'Obtain startup review of the trial plan' else 'Schedule trial kickoff with customer' end,'owner','startup','assignee','Founder','due',current_date,'status','planned','blocker','','completionSourceId',''));
 insert into trial_events(program_id,id,version,partner_id,payload) values(p_program,p_key,1,p_partner,jsonb_build_object('id',p_key,'trialId',plan->>'trialId','partnerId',p_partner,'trigger','plan.reviewed','status','succeeded','actor',p_actor,'at',now(),'taskId','action-'||p_key,'reportId','','summary','Verified customer acknowledgment persisted and next-action task created.'));
 update programs set version=version+1 where id=p_program;
 insert into mutation_receipts(program_id,key,version) values(p_program,p_key,pv+1);
 insert into history(program_id,id,version,partner_id,payload) values(p_program,p_key,pv+1,p_partner,jsonb_build_object('id',p_key,'actor',p_actor,'at',now(),'action','customer acknowledged exact trial plan '||p_plan,'version',pv+1));
end; $$;
revoke all on function public.acknowledge_trial(text,text,text,integer,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.acknowledge_trial(text,text,text,integer,uuid,jsonb,text) to service_role;

create table public.trial_reminders(program_id text not null references programs on delete cascade,partner_id text not null,task_id text not null,task_version integer not null,day date not null,summary text not null,created_at timestamptz not null default now(),primary key(program_id,task_id,task_version,day));
alter table public.trial_reminders enable row level security;
create policy reminder_read on public.trial_reminders for select to authenticated using(public.can_read(program_id) or exists(select 1 from memberships where program_id=trial_reminders.program_id and user_id=auth.uid() and role='customer' and partner_id=trial_reminders.partner_id));

create trigger trial_events_immutable before update on public.trial_events for each row execute function public.immutable_trial_record();

create trigger trial_reports_immutable before update on public.trial_reports for each row execute function public.immutable_trial_record();

-- A verified customer can update only customer-owned tasks on the current plan.
create or replace function public.update_customer_trial_task(p_program text,p_partner text,p_task text,p_task_version integer,p_expected integer,p_actor uuid,p_status text,p_source jsonb,p_key text) returns void language plpgsql security definer set search_path=public as $$
declare task jsonb; next_task jsonb; pv integer; plan_version integer;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select version into pv from programs where id=p_program for update;
 if not exists(select 1 from memberships where program_id=p_program and user_id=p_actor and role='customer' and partner_id=p_partner) then raise exception 'customer permission denied'; end if;
 if exists(select 1 from mutation_receipts where program_id=p_program and key=p_key) then return; end if;
 if pv<>p_expected then raise exception 'version conflict'; end if;
 select payload into task from trial_tasks where program_id=p_program and partner_id=p_partner and id=p_task;
 if task is null or task->>'owner'<>'customer' then raise exception 'Customer-owned task required'; end if;
 select max(version) into plan_version from trial_plans where program_id=p_program and partner_id=p_partner and payload->>'trialId'=task->>'trialId';
 if (task->>'version')::integer<>p_task_version or (task->>'planVersion')::integer<>plan_version then raise exception 'Task or plan changed; refresh before updating'; end if;
 if p_status not in ('working','blocked','done') then raise exception 'Invalid customer task status'; end if;
 if p_source->>'partnerId'<>p_partner or p_source->>'kind'<>'reported note' or p_source->>'author'<>p_actor::text or length(p_source->>'content')<5 then raise exception 'Task source scope mismatch'; end if;
 next_task=task||jsonb_build_object('version',p_task_version+1,'status',p_status,'blocker',case when p_status='blocked' then p_source->>'content' else '' end,'completionSourceId',case when p_status='done' then p_source->>'id' else '' end);
 insert into sources(program_id,id,version,partner_id,payload) values(p_program,p_source->>'id',1,p_partner,p_source);
 update trial_tasks set payload=next_task,version=p_task_version+1 where program_id=p_program and id=p_task;
 update programs set version=version+1 where id=p_program;
 insert into mutation_receipts(program_id,key,version) values(p_program,p_key,pv+1);
 insert into history(program_id,id,version,partner_id,payload) values(p_program,p_key,pv+1,p_partner,jsonb_build_object('id',p_key,'actor',p_actor,'at',now(),'action','customer task update '||p_task||' / '||p_status,'version',pv+1));
end; $$;
revoke all on function public.update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text) to service_role;
