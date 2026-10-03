create or replace function public.finish_job(p_job uuid,p_expected integer,p_state jsonb,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare j job_inputs; final_status text; result_state jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'server writes only'; end if;
 select * into j from job_inputs where id=p_job for update;
 if not found then raise exception 'job not found'; end if;
 final_status=case when j.status='cancelled' then 'quarantined' else p_status end;
 result_state=p_state;
 if final_status='quarantined' then
 result_state=jsonb_set(result_state,'{runs}',(select jsonb_agg(case when value->>'id'=p_job::text then jsonb_set(value,'{status}','"quarantined"') else value end) from jsonb_array_elements(p_state->'runs')));
 end if;
 perform commit_program(j.program_id,p_expected,p_job::text||'-result',result_state,j.actor);
 update job_inputs set status=final_status,updated_at=now() where id=p_job;
 insert into job_events(job_id,program_id,status,summary) values(p_job,j.program_id,final_status,'Provider output persisted as a reviewed proposal or quarantined; no external action executed.');
end; $$;
revoke all on function public.finish_job(uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_job(uuid,integer,jsonb,text) to service_role;
