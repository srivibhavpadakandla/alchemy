-- New Supabase projects may disable automatic Data API grants.
-- RLS controls rows; explicit grants define the permitted API surface.
grant usage on schema public to authenticated,service_role;
revoke all on table
  public.programs,public.memberships,public.mutation_receipts,
  public.partners,public.work,public.sources,public.requests,public.promises,
  public.agreements,public.observations,public.scenarios,public.decisions,
  public.runs,public.proposals,public.reviews,public.history,
  public.usage_reservations,public.share_links,public.job_inputs,public.job_events,
  public.invitations,public.trial_reports,public.trial_events,public.trial_plans,
  public.trial_tasks,public.trial_measurements,public.trial_decisions,
  public.trial_reminders,public.trial_attachments,public.frontdesk_bookings,
  public.trial_email_rules,public.trial_email_deliveries
from public,anon,authenticated;
grant select on table
  public.programs,public.memberships,public.mutation_receipts,
  public.partners,public.work,public.sources,public.requests,public.promises,
  public.agreements,public.observations,public.scenarios,public.decisions,
  public.runs,public.proposals,public.reviews,public.history,
  public.usage_reservations,public.share_links,public.job_inputs,public.job_events,
  public.invitations,public.trial_reports,public.trial_events,public.trial_plans,
  public.trial_tasks,public.trial_measurements,public.trial_decisions,
  public.trial_reminders,public.trial_attachments,public.frontdesk_bookings,
  public.trial_email_rules,public.trial_email_deliveries
to authenticated;
grant select,insert,update,delete on table
  public.programs,public.memberships,public.mutation_receipts,
  public.partners,public.work,public.sources,public.requests,public.promises,
  public.agreements,public.observations,public.scenarios,public.decisions,
  public.runs,public.proposals,public.reviews,public.history,
  public.usage_reservations,public.share_links,public.job_inputs,public.job_events,
  public.invitations,public.trial_reports,public.trial_events,public.trial_plans,
  public.trial_tasks,public.trial_measurements,public.trial_decisions,
  public.trial_reminders,public.trial_attachments,public.frontdesk_bookings,
  public.trial_email_rules,public.trial_email_deliveries
to service_role;
revoke all on sequence public.job_events_sequence_seq from public,anon,authenticated;
grant usage,select on sequence public.job_events_sequence_seq to service_role;
revoke all on function
  public.can_read(text),public.read_program(text),public.read_trial(text,text),
  public.create_program(jsonb,uuid),public.commit_program(text,integer,text,jsonb,uuid),
  public.reserve_usage(uuid,text,uuid,integer),public.accept_invitation(text,uuid,text),
  public.finish_job(uuid,integer,jsonb,text),public.cancel_job(uuid,uuid,integer,jsonb),
  public.immutable_trial_record(),
  public.acknowledge_trial(text,text,text,integer,uuid,jsonb,text),
  public.update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text),
  public.reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz)
from public,anon,authenticated;
grant execute on function public.can_read(text),public.read_program(text),public.read_trial(text,text) to authenticated;
grant execute on function
  public.can_read(text),public.read_program(text),public.read_trial(text,text),
  public.create_program(jsonb,uuid),public.commit_program(text,integer,text,jsonb,uuid),
  public.reserve_usage(uuid,text,uuid,integer),public.accept_invitation(text,uuid,text),
  public.finish_job(uuid,integer,jsonb,text),public.cancel_job(uuid,uuid,integer,jsonb),
  public.immutable_trial_record(),
  public.acknowledge_trial(text,text,text,integer,uuid,jsonb,text),
  public.update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text),
  public.reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz)
to service_role;
