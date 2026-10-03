create table public.trial_email_rules (
  id text primary key,
  program_id text not null references public.programs on delete cascade,
  partner_id text not null,
  plan_id text not null,
  actor_id uuid not null references auth.users,
  version integer not null default 1,
  enabled boolean not null default false,
  last_error text,
  payload jsonb not null,
  reviewed_at timestamptz not null default now(),
  unique(program_id,partner_id),
  foreign key(program_id,partner_id) references public.partners(program_id,id)
);
create table public.trial_email_deliveries (
  key text primary key,
  rule_id text not null references public.trial_email_rules on delete cascade,
  program_id text not null references public.programs on delete cascade,
  partner_id text not null,
  recipient text not null,
  subject text not null,
  body text not null,
  sender text not null,
  event text not null,
  status text not null check(status in ('pending','accepted','delivered','failed','uncertain','cancelled')),
  provider_id text,
  error text,
  attempts integer not null default 0,
  retry_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trial_email_delivery_reconciliation on public.trial_email_deliveries(status,updated_at);
create index trial_email_retry_cleanup on public.trial_email_deliveries(created_at) where not retry_closed and status in ('pending','uncertain');
alter table public.trial_email_rules enable row level security;
alter table public.trial_email_deliveries enable row level security;
create policy trial_email_rules_read on public.trial_email_rules for select to authenticated using(public.can_read(program_id));
create policy trial_email_deliveries_read on public.trial_email_deliveries for select to authenticated using(public.can_read(program_id));
-- Only validated server routes and durable jobs may write or deliver messages.
