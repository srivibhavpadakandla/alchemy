create or replace function public.cancel_job(p_job uuid,p_actor uuid,p_expected integer,p_state jsonb) returns void language plpgsql security definer set search_path=public as $$
declare j job_inputs;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select * into j from job_inputs where id=p_job for update;
 if not found then raise exception 'job not found'; end if;
 if j.status='cancelled' then return; end if;
 if j.status not in('queued','working') then raise exception 'Task has already finished'; end if;
 perform commit_program(j.program_id,p_expected,p_job::text||'-cancel',p_state,p_actor);
 update job_inputs set status='cancelled',updated_at=now() where id=p_job;
 insert into job_events(job_id,program_id,status,summary) values(p_job,j.program_id,'cancelled','Cancellation recorded; any late provider output will be quarantined.');
end; $$;
revoke all on function public.cancel_job(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.cancel_job(uuid,uuid,integer,jsonb) to service_role;
