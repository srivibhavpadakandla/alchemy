# Hosted schema verification

Apply migrations 001 through 009 in order to the separate Alchemy project. The consolidated local bootstrap wraps all nine migrations in one transaction and refuses to run if an Alchemy table already exists. It assumes the managed Supabase Auth and Storage schemas and roles are present; it does not create or replace those schemas or touch another project. An existing database needs individually tracked migrations instead of the fresh bootstrap.

The bootstrap uses ordinary transactional DDL; no concurrent indexes or extra extensions are required. The app uses built-in JSON, UUID column types and PL/pgSQL. Migration 006 creates a private `alchemy-evidence` bucket limited to 5 MB PDF/PNG/JPEG uploads. Migration 009 explicitly grants authenticated reads and service-role writes because automatic exposure can be disabled on new projects. RLS continues to scope authenticated rows; direct authenticated writes and anonymous reads are not granted. These are distinct controls in [Supabase's Data API security documentation](https://supabase.com/docs/guides/api/securing-your-api).

Run these read-only queries in the SQL editor. They inspect metadata and contain no credentials, customer identifiers or recipients. Results are schema evidence; they do not establish successful login, storage upload/download, provider delivery, or independent-user authorization tests.

## Before bootstrap

Expected: all prerequisite booleans true, `no_existing_alchemy_schema` true, and `service_bypasses_rls` true. The `postgres` role in the SQL editor creates the application objects; it should not be substituted for the service key in application code. Supabase supplies its managed [database roles](https://supabase.com/docs/guides/database/postgres/roles).

```sql
select
  to_regclass('auth.users') is not null as auth_users_present,
  to_regprocedure('auth.uid()') is not null as auth_uid_present,
  to_regprocedure('auth.role()') is not null as auth_role_present,
  to_regclass('storage.buckets') is not null as storage_buckets_present,
  exists(select 1 from pg_roles where rolname='authenticated') as authenticated_role_present,
  exists(select 1 from pg_roles where rolname='anon') as anon_role_present,
  exists(select 1 from pg_roles where rolname='service_role') as service_role_present,
  coalesce((select rolbypassrls from pg_roles where rolname='service_role'),false) as service_bypasses_rls,
  to_regclass('public.programs') is null as no_existing_alchemy_schema;
```

## Tables, RLS and grants

Expected: 32 rows. Every row has `exists_in_database`, `rls_enabled`, `authenticated_read`, and `service_dml` true. Both `anonymous_access` and `authenticated_write` must be false. Separate service DML checks are intentional: PostgreSQL's comma-separated privilege test checks whether *any* listed privilege is held.

```sql
with expected(name) as (
  values ('programs'),('memberships'),('mutation_receipts'),('partners'),('work'),
    ('sources'),('requests'),('promises'),('agreements'),('observations'),
    ('scenarios'),('decisions'),('runs'),('proposals'),('reviews'),('history'),
    ('usage_reservations'),('share_links'),('job_inputs'),('job_events'),
    ('invitations'),('trial_reports'),('trial_events'),('trial_plans'),
    ('trial_tasks'),('trial_measurements'),('trial_decisions'),('trial_reminders'),
    ('trial_attachments'),('frontdesk_bookings'),('trial_email_rules'),('trial_email_deliveries')
)
select e.name, c.oid is not null as exists_in_database,
  coalesce(c.relrowsecurity,false) as rls_enabled,
  coalesce(has_table_privilege('authenticated',c.oid,'select'),false) as authenticated_read,
  coalesce(has_table_privilege('service_role',c.oid,'select')
    and has_table_privilege('service_role',c.oid,'insert')
    and has_table_privilege('service_role',c.oid,'update')
    and has_table_privilege('service_role',c.oid,'delete'),false) as service_dml,
  coalesce(has_table_privilege('anon',c.oid,'select,insert,update,delete,truncate'),false) as anonymous_access,
  coalesce(has_table_privilege('authenticated',c.oid,'insert,update,delete,truncate'),false) as authenticated_write
from expected e
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind='r'
order by e.name;
```

## Function access

Expected: all 13 functions exist and have `service_execute=true`; all have `anonymous_execute=false`. `authenticated_execute` is true only for `can_read`, `read_program` and `read_trial`. Scoped customer mutation functions are invoked by authenticated application routes using the server role after verifying the actor, rather than by unrestricted browser RPC calls.

```sql
with expected(signature) as (
  values ('can_read(text)'),('read_program(text)'),('read_trial(text,text)'),
    ('create_program(jsonb,uuid)'),('commit_program(text,integer,text,jsonb,uuid)'),
    ('reserve_usage(uuid,text,uuid,integer)'),('accept_invitation(text,uuid,text)'),
    ('finish_job(uuid,integer,jsonb,text)'),('cancel_job(uuid,uuid,integer,jsonb)'),
    ('immutable_trial_record()'),('acknowledge_trial(text,text,text,integer,uuid,jsonb,text)'),
    ('update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text)'),
    ('reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz)')
), resolved as (
  select signature,to_regprocedure('public.'||signature)::oid as oid from expected
)
select signature,oid is not null as exists_in_database,
  coalesce(has_function_privilege('service_role',oid,'execute'),false) as service_execute,
  coalesce(has_function_privilege('authenticated',oid,'execute'),false) as authenticated_execute,
  coalesce(has_function_privilege('anon',oid,'execute'),false) as anonymous_execute
from resolved order by signature;
```

## Policies and private bucket

Expected: every app policy is SELECT-only for authenticated users. No anonymous or client mutation policy should exist. `memberships` exposes the requesting account's own membership; `can_read` excludes customer-only members from whole-program records. Customer portal access uses `read_trial`, which checks the scoped membership. Attachments, reminders and bookings have additional customer scope policies.

```sql
select tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public'
  and tablename in ('programs','memberships','mutation_receipts','partners','work',
    'sources','requests','promises','agreements','observations','scenarios','decisions',
    'runs','proposals','reviews','history','usage_reservations','share_links',
    'job_inputs','job_events','invitations','trial_reports','trial_events','trial_plans',
    'trial_tasks','trial_measurements','trial_decisions','trial_reminders',
    'trial_attachments','frontdesk_bookings','trial_email_rules','trial_email_deliveries')
order by tablename,policyname;
```

```sql
select id,public,file_size_limit,allowed_mime_types
from storage.buckets where id='alchemy-evidence';
```

Expected bucket: one row, `public=false`, `file_size_limit=5242880`, allowed MIME types PDF, PNG and JPEG. Uploads/downloads go through validated server routes; this migration does not add broad client access to Storage objects.

## Durable execution metadata

Expected: `retry_closed` boolean exists and defaults to false; the two email reconciliation indexes exist. The booking RPC stores `executionLeaseUntil` in its durable receipt. `job_events_sequence_seq` allows only service-role usage among the client/server API roles. These checks cannot prove an external calendar event or email was delivered.

```sql
select column_name,data_type,column_default,is_nullable
from information_schema.columns
where table_schema='public' and table_name='trial_email_deliveries'
  and column_name in ('sender','attempts','retry_closed','provider_id','status')
order by column_name;

select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='trial_email_deliveries'
  and indexname in ('trial_email_delivery_reconciliation','trial_email_retry_cleanup');

select position('executionLeaseUntil' in pg_get_functiondef(
  'public.reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz)'::regprocedure))>0
  as booking_lease_persisted;

select has_sequence_privilege('service_role','public.job_events_sequence_seq','usage') as service_sequence_usage,
  has_sequence_privilege('authenticated','public.job_events_sequence_seq','usage') as authenticated_sequence_usage,
  has_sequence_privilege('anon','public.job_events_sequence_seq','usage') as anonymous_sequence_usage;
```
