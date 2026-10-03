import { beforeAll, afterAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { emptyState } from "../src/lib/domain";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const tableNames = [
  "programs",
  "memberships",
  "mutation_receipts",
  "partners",
  "work",
  "sources",
  "requests",
  "promises",
  "agreements",
  "observations",
  "scenarios",
  "decisions",
  "runs",
  "proposals",
  "reviews",
  "history",
  "usage_reservations",
  "share_links",
  "job_inputs",
  "job_events",
  "invitations",
  "trial_reports",
  "trial_events",
  "trial_plans",
  "trial_tasks",
  "trial_measurements",
  "trial_decisions",
  "trial_reminders",
  "trial_attachments",
  "frontdesk_bookings",
  "trial_email_rules",
  "trial_email_deliveries",
];
beforeAll(async () => {
  await db.exec(
    `create schema auth;create role authenticated;create role anon;create role service_role bypassrls;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${other}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;grant usage on schema auth to authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);alter default privileges in schema public revoke all on tables from public,anon,authenticated,service_role;alter default privileges revoke execute on functions from public,anon,authenticated,service_role;`,
  );
  for (const name of readdirSync("supabase/migrations")
    .filter((n) => /^00[1-8]_/.test(n))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select has_table_privilege('authenticated','public.programs','select') as allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select has_function_privilege('authenticated','public.read_program(text)','execute') as allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  await db.exec(
    readFileSync("supabase/migrations/009_explicit_api_grants.sql", "utf8"),
  );
});
afterAll(() => db.close());
it("explicit exposure restores authenticated read and all service DML grants for every RLS-protected table under restrictive defaults", async () => {
  for (const name of tableNames) {
    const grants = (
      await db.query<{
        rls: boolean;
        auth_read: boolean;
        service_dml: boolean;
        anon_any: boolean;
        auth_write: boolean;
      }>(
        `select c.relrowsecurity as rls,has_table_privilege('authenticated',c.oid,'select') as auth_read,has_table_privilege('service_role',c.oid,'select') and has_table_privilege('service_role',c.oid,'insert') and has_table_privilege('service_role',c.oid,'update') and has_table_privilege('service_role',c.oid,'delete') as service_dml,has_table_privilege('anon',c.oid,'select,insert,update,delete') as anon_any,has_table_privilege('authenticated',c.oid,'insert,update,delete,truncate') as auth_write from pg_class c where c.oid=$1::regclass`,
        [`public.${name}`],
      )
    ).rows[0];
    expect(grants, name).toEqual({
      rls: true,
      auth_read: true,
      service_dml: true,
      anon_any: false,
      auth_write: false,
    });
  }
});
it("exposes only scoped read functions to authenticated; mutations remain service-only", async () => {
  const calls = [
    "can_read(text)",
    "read_program(text)",
    "read_trial(text,text)",
    "create_program(jsonb,uuid)",
    "commit_program(text,integer,text,jsonb,uuid)",
    "reserve_usage(uuid,text,uuid,integer)",
    "accept_invitation(text,uuid,text)",
    "finish_job(uuid,integer,jsonb,text)",
    "cancel_job(uuid,uuid,integer,jsonb)",
    "immutable_trial_record()",
    "acknowledge_trial(text,text,text,integer,uuid,jsonb,text)",
    "update_customer_trial_task(text,text,text,integer,integer,uuid,text,jsonb,text)",
    "reserve_frontdesk_booking(text,text,uuid,uuid,text,timestamptz,timestamptz)",
  ];
  for (const fn of calls) {
    const row = (
      await db.query<{
        authenticated: boolean;
        anon: boolean;
        service: boolean;
      }>(
        "select has_function_privilege('authenticated',$1,'execute') as authenticated,has_function_privilege('anon',$1,'execute') as anon,has_function_privilege('service_role',$1,'execute') as service",
        [`public.${fn}`],
      )
    ).rows[0];
    expect(row, fn).toEqual({
      authenticated: [
        "can_read(text)",
        "read_program(text)",
        "read_trial(text,text)",
      ].includes(fn),
      anon: false,
      service: true,
    });
  }
});
it("allows real service-role program creation while owner reads stay isolated and direct owner writes are denied", async () => {
  await db.exec(
    `set role service_role;select set_config('request.jwt.claim.role','service_role',false);select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  await db.query("select create_program($1,$2)", [
    JSON.stringify(emptyState("live", owner)),
    owner,
  ]);
  await db.query(
    "insert into job_inputs(id,program_id,actor,input,role,input_hash) values($1,$2,$3,'{}','Treasurer','hash')",
    [crypto.randomUUID(), owner, owner],
  );
  await db.query(
    "insert into job_events(job_id,program_id,status,summary) select id,program_id,'queued','Actual durable event' from job_inputs where program_id=$1",
    [owner],
  );
  await db.exec("reset role;set role authenticated");
  expect((await db.query("select id from programs")).rows).toHaveLength(1);
  expect(
    (
      await db.query<{ read_program: { id: string } }>(
        "select read_program($1)",
        [owner],
      )
    ).rows[0].read_program.id,
  ).toBe(owner);
  await expect(
    db.query("update programs set name='Bypass' where id=$1", [owner]),
  ).rejects.toThrow("permission denied");
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false);`);
  expect((await db.query("select id from programs")).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ read_program: unknown }>("select read_program($1)", [
        owner,
      ])
    ).rows[0].read_program,
  ).toBeNull();
  await db.exec("reset role");
});
