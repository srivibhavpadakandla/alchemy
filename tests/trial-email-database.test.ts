import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { emptyState } from "../src/lib/domain";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222",
  foreign = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  await db.exec(
    `create schema auth; create role authenticated; create role anon; create role service_role; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${customer}'),('${foreign}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  for (const name of [
    "001_launchguild.sql",
    "002_sharing_and_jobs.sql",
    "003_job_finish.sql",
    "004_cancel_job.sql",
    "005_alchemy_trials.sql",
    "006_private_attachments.sql",
    "008_trial_email.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  await db.exec(
    `grant usage on schema public,auth to authenticated; grant select,insert,update,delete on public.trial_email_rules, public.trial_email_deliveries to authenticated; grant select on public.memberships to authenticated; select set_config('request.jwt.claim.role','service_role',false);select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  await db.query("select public.create_program($1,$2)", [
    JSON.stringify(emptyState("live", owner)),
    owner,
  ]);
  await db.query(
    "insert into partners(program_id,id,payload) values($1,'cafe','{}')",
    [owner],
  );
  await db.query(
    "insert into memberships(program_id,user_id,role,partner_id) values($1,$2,'customer','cafe')",
    [owner, customer],
  );
  await db.query(
    "insert into trial_email_rules(id,program_id,partner_id,plan_id,actor_id,payload) values('rule',$1,'cafe','plan',$2,'{}')",
    [owner, owner],
  );
  await db.query(
    "insert into trial_email_deliveries(key,rule_id,program_id,partner_id,recipient,sender,subject,body,event,status) values('pilot-event-recipient','rule',$1,'cafe','authorized@example.test','sender@example.test','Reviewed subject','Reviewed body','due-2026-09-09','pending')",
    [owner],
  );
});
afterAll(() => db.close());
it("durable duplicate pilot-event-recipient jobs cannot insert a second message", async () => {
  await expect(
    db.query(
      "insert into trial_email_deliveries(key,rule_id,program_id,partner_id,recipient,sender,subject,body,event,status) values('pilot-event-recipient','rule',$1,'cafe','authorized@example.test','sender@example.test','subject','body','event','pending')",
      [owner],
    ),
  ).rejects.toThrow("unique");
  expect(
    (await db.query("select * from trial_email_deliveries")).rows,
  ).toHaveLength(1);
});
it("compare-and-swap claim allows exactly one job to advance the same persisted attempt", async () => {
  const claim =
    "update trial_email_deliveries set attempts=1,status='pending' where key='pilot-event-recipient' and attempts=0 and status in ('pending','uncertain') returning key";
  expect((await db.query(claim)).rows).toHaveLength(1);
  expect((await db.query(claim)).rows).toHaveLength(0);
});
it("customer and unrelated accounts cannot read email configuration or recipient/message history", async () => {
  for (const actor of [customer, foreign]) {
    await db.exec(
      `select set_config('request.jwt.claim.sub','${actor}',false);set role authenticated;`,
    );
    expect(
      (await db.query("select * from trial_email_rules")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from trial_email_deliveries")).rows,
    ).toHaveLength(0);
    await db.exec("reset role");
  }
});
it("authenticated owner can read receipts but cannot bypass validated routes to send or change rules", async () => {
  await db.exec(
    `select set_config('request.jwt.claim.sub','${owner}',false);set role authenticated;`,
  );
  expect(
    (await db.query("select * from trial_email_deliveries")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("update trial_email_rules set enabled=true returning id"))
      .rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into trial_email_deliveries(key,rule_id,program_id,partner_id,recipient,sender,subject,body,event,status) values('bypass','rule',$1,'cafe','recipient@example.test','sender@example.test','subject','body','event','pending')",
      [owner],
    ),
  ).rejects.toThrow("row-level security");
  await db.exec("reset role");
});
