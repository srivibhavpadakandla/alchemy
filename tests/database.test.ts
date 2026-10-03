import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { emptyState, newPartner } from "../src/lib/domain";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  await db.exec(
    `create schema auth; create role authenticated; create role anon; create role service_role; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;`,
  );
  await db.exec(
    `create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  for (const migration of [
    "001_launchguild.sql",
    "002_sharing_and_jobs.sql",
    "003_job_finish.sql",
    "004_cancel_job.sql",
    "005_alchemy_trials.sql",
    "006_private_attachments.sql",
  ])
    await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec(
    "grant usage on schema public,auth to authenticated; grant select on all tables in schema public to authenticated;",
  );
  await db.exec(
    `select set_config('request.jwt.claim.role','service_role',false); select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  await db.query("select public.create_program($1,$2)", [
    JSON.stringify(emptyState("live", owner)),
    owner,
  ]);
});
afterAll(() => db.close());
it("round-trips normalized program collections", async () => {
  const s = emptyState("live", owner);
  s.version = 2;
  s.partners.push(newPartner("p", "Private partner"));
  await db.query("select public.commit_program($1,$2,$3,$4,$5)", [
    owner,
    1,
    "first",
    JSON.stringify(s),
    owner,
  ]);
  const r = await db.query<{ read_program: unknown }>(
    "select public.read_program($1)",
    [owner],
  );
  expect(r.rows[0].read_program).toMatchObject({
    id: owner,
    version: 2,
    partners: [{ name: "Private partner" }],
  });
});
it("denies another account reading or writing program data", async () => {
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  const r = await db.query<{ read_program: unknown }>(
    "select public.read_program($1)",
    [owner],
  );
  expect(r.rows[0].read_program).toBeNull();
  await expect(
    db.query("select public.commit_program($1,$2,$3,$4,$5)", [
      owner,
      2,
      "foreign",
      JSON.stringify({ ...emptyState("live", owner), version: 3 }),
      other,
    ]),
  ).rejects.toThrow("permission denied");
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`);
});
it("rejects stale concurrent commit atomically", async () => {
  await expect(
    db.query("select public.commit_program($1,$2,$3,$4,$5)", [
      owner,
      1,
      "stale",
      JSON.stringify({ ...emptyState("live", owner), version: 3 }),
      owner,
    ]),
  ).rejects.toThrow("version conflict");
  const r = await db.query<{ version: number }>(
    "select version from public.programs where id=$1",
    [owner],
  );
  expect(r.rows[0].version).toBe(2);
});
it("duplicate key does not commit again", async () => {
  await db.query("select public.commit_program($1,$2,$3,$4,$5)", [
    owner,
    1,
    "first",
    JSON.stringify({ ...emptyState("live", owner), version: 99 }),
    owner,
  ]);
  const r = await db.query<{ version: number }>(
    "select version from public.programs where id=$1",
    [owner],
  );
  expect(r.rows[0].version).toBe(2);
});
it("direct authenticated writes cannot bypass server domain validation", async () => {
  await db.exec(
    "select set_config('request.jwt.claim.role','authenticated',false)",
  );
  await expect(
    db.query("select public.commit_program($1,$2,$3,$4,$5)", [
      owner,
      2,
      "bypass",
      JSON.stringify({ ...emptyState("live", owner), version: 3 }),
      owner,
    ]),
  ).rejects.toThrow("server writes only");
  await db.exec(
    "select set_config('request.jwt.claim.role','service_role',false)",
  );
});
it("transactionally enforces three concurrent reservations", async () => {
  for (let i = 0; i < 3; i++)
    await db.query("select public.reserve_usage($1,$2,$3,$4)", [
      crypto.randomUUID(),
      owner,
      owner,
      20000,
    ]);
  await expect(
    db.query("select public.reserve_usage($1,$2,$3,$4)", [
      crypto.randomUUID(),
      owner,
      owner,
      20000,
    ]),
  ).rejects.toThrow("three concurrent");
});
it("share revocation and expiry prevent usable public lookup data", async () => {
  await db.query(
    "insert into share_links(token_hash,program_id,payload,expires_at) values('test-token',$1,'{\"redacted\":true}',now()+interval '1 day')",
    [owner],
  );
  await db.query(
    "update share_links set revoked_at=now() where token_hash='test-token'",
  );
  const r = await db.query(
    "select payload from share_links where token_hash='test-token' and revoked_at is null and expires_at>now()",
  );
  expect(r.rows).toHaveLength(0);
});
it("invitation acceptance is scoped to the verified recipient and is single-use", async () => {
  const id = crypto.randomUUID();
  await db.query(
    "insert into invitations(id,program_id,invited_email,role,token_hash,expires_at,created_by) values($1,$2,'recipient@example.test','viewer','invite-hash',now()+interval '1 day',$3)",
    [id, owner, owner],
  );
  await expect(
    db.query("select accept_invitation($1,$2,$3)", [
      "invite-hash",
      other,
      "wrong@example.test",
    ]),
  ).rejects.toThrow("another verified account");
  await db.query("select accept_invitation($1,$2,$3)", [
    "invite-hash",
    other,
    "recipient@example.test",
  ]);
  await expect(
    db.query("select accept_invitation($1,$2,$3)", [
      "invite-hash",
      other,
      "recipient@example.test",
    ]),
  ).rejects.toThrow("used");
  const r = await db.query<{ role: string }>(
    "select role from memberships where program_id=$1 and user_id=$2",
    [owner, other],
  );
  expect(r.rows[0].role).toBe("viewer");
});
it("customer scope hides all program data and other pilots; revocation takes effect", async () => {
  const plan = {
    id: "scope-plan",
    trialId: "scope-trial",
    partnerId: "p",
    version: 1,
    previousId: "",
    needsSourceId: "shared-source",
    founderApprovalSourceId: "",
    customerApprovalSourceId: "",
    start: "2026-09-01",
    end: "2026-09-30",
    startupDeliverables: "Install dashboard",
    customerResponsibilities: "Record measurements",
    metric: { baselineSourceId: "" },
    createdAt: "2026-09-01T00:00:00Z",
  };
  await db.query(
    "update memberships set role='customer',partner_id='p' where program_id=$1 and user_id=$2",
    [owner, other],
  );
  await db.query(
    "insert into partners(program_id,id,payload) values($1,'secret-customer',$2)",
    [owner, JSON.stringify({ id: "secret-customer", name: "Secret customer" })],
  );
  await db.query(
    "insert into trial_plans(program_id,id,partner_id,payload) values($1,'scope-plan','p',$2)",
    [owner, JSON.stringify(plan)],
  );
  for (const id of ["shared-source", "private-note"])
    await db.query(
      "insert into sources(program_id,id,partner_id,payload) values($1,$2,'p',$3)",
      [owner, id, JSON.stringify({ id, content: id })],
    );
  await db.exec(
    `select set_config('request.jwt.claim.sub','${other}',false); set role authenticated;`,
  );
  const scoped = await db.query<{
    read_trial: { customer: { id: string }; sources: { id: string }[] };
  }>("select read_trial($1,$2)", [owner, "p"]);
  expect(scoped.rows[0].read_trial.customer.id).toBe("p");
  expect(scoped.rows[0].read_trial.sources.map((s) => s.id)).toEqual([
    "shared-source",
  ]);
  const full = await db.query<{ read_program: unknown }>(
    "select read_program($1)",
    [owner],
  );
  expect(full.rows[0].read_program).toBeNull();
  expect(
    (
      await db.query<{ read_trial: unknown }>("select read_trial($1,$2)", [
        owner,
        "secret-customer",
      ])
    ).rows[0].read_trial,
  ).toBeNull();
  expect((await db.query("select * from trial_plans")).rows).toHaveLength(0);
  expect((await db.query("select * from partners")).rows).toHaveLength(0);
  expect((await db.query("select * from sources")).rows).toHaveLength(0);
  await db.exec("reset role");
  await db.query("delete from memberships where program_id=$1 and user_id=$2", [
    owner,
    other,
  ]);
  expect(
    (
      await db.query<{ read_trial: unknown }>("select read_trial($1,$2)", [
        owner,
        "p",
      ])
    ).rows[0].read_trial,
  ).toBeNull();
  await db.query(
    "insert into memberships(program_id,user_id,role,partner_id) values($1,$2,'customer','p')",
    [owner, other],
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`);
});
it("verified customer acknowledgment keeps exact terms and creates a task and event transactionally", async () => {
  const source = {
    id: "ack-source",
    partnerId: "p",
    kind: "direct acknowledgment",
    author: other,
    content: "I acknowledge this exact plan.",
  };
  await expect(
    db.query("select acknowledge_trial($1,$2,$3,$4,$5,$6,$7)", [
      owner,
      "secret-customer",
      "scope-plan",
      2,
      other,
      JSON.stringify(source),
      "ack-denied",
    ]),
  ).rejects.toThrow("customer permission denied");
  await expect(
    db.query("select acknowledge_trial($1,$2,$3,$4,$5,$6,$7)", [
      owner,
      "p",
      "scope-plan",
      1,
      other,
      JSON.stringify(source),
      "ack-stale",
    ]),
  ).rejects.toThrow("version conflict");
  await db.query("select acknowledge_trial($1,$2,$3,$4,$5,$6,$7)", [
    owner,
    "p",
    "scope-plan",
    2,
    other,
    JSON.stringify(source),
    "ack-valid",
  ]);
  await db.query("select acknowledge_trial($1,$2,$3,$4,$5,$6,$7)", [
    owner,
    "p",
    "scope-plan",
    2,
    other,
    JSON.stringify(source),
    "ack-valid",
  ]);
  const rows = await db.query<{
    payload: {
      startupDeliverables: string;
      customerApprovalSourceId: string;
      version: number;
    };
  }>("select payload from trial_plans where id='ack-valid'");
  expect(rows.rows[0].payload).toMatchObject({
    startupDeliverables: "Install dashboard",
    customerApprovalSourceId: "ack-source",
    version: 2,
  });
  expect(
    (await db.query("select * from trial_events where id='ack-valid'")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from trial_tasks where id='action-ack-valid'"))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query<{ version: number }>(
        "select version from programs where id=$1",
        [owner],
      )
    ).rows[0].version,
  ).toBe(3);
  await expect(
    db.query(
      "update trial_plans set payload=payload||'{\"startupDeliverables\":\"Changed\"}' where id='scope-plan'",
    ),
  ).rejects.toThrow("immutable");
});
it("private attachment metadata and reminder delivery are customer-scoped and deduplicated", async () => {
  for (const pid of ["p", "secret-customer"])
    await db.query(
      "insert into trial_attachments(id,program_id,partner_id,source_id,object_path,filename,mime_type,size_bytes,sha256,uploaded_by) values($1,$2,$3,'attachment-source',$4,'receipt.pdf','application/pdf',20,'hash',$5)",
      [crypto.randomUUID(), owner, pid, `private/${pid}`, owner],
    );
  for (let i = 0; i < 2; i++)
    await db.query(
      "insert into trial_reminders(program_id,partner_id,task_id,task_version,day,summary) values($1,'p','task',1,'2026-10-03','Reminder') on conflict do nothing",
      [owner],
    );
  await db.query(
    "insert into trial_reminders(program_id,partner_id,task_id,task_version,day,summary) values($1,'secret-customer','secret-task',1,'2026-10-03','Private reminder')",
    [owner],
  );
  expect(
    (
      await db.query<{ public: boolean }>(
        "select public from storage.buckets where id='alchemy-evidence'",
      )
    ).rows[0].public,
  ).toBe(false);
  await db.exec(
    `select set_config('request.jwt.claim.sub','${other}',false); set role authenticated;`,
  );
  expect(
    (
      await db.query<{ partner_id: string }>("select * from trial_attachments")
    ).rows.map((r) => r.partner_id),
  ).toEqual(["p"]);
  expect(
    (
      await db.query<{ summary: string }>("select * from trial_reminders")
    ).rows.map((r) => r.summary),
  ).toEqual(["Reminder"]);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${owner}',false)`,
  );
});
it("customer task updates enforce current plan, side, source and version before committing", async () => {
  const task = {
    id: "customer-task",
    trialId: "scope-trial",
    partnerId: "p",
    planVersion: 2,
    version: 1,
    title: "Record customer samples",
    owner: "customer",
    assignee: "Customer operator",
    due: "2026-09-30",
    status: "planned",
    blocker: "",
    completionSourceId: "",
  };
  await db.query(
    "insert into trial_tasks(program_id,id,partner_id,payload) values($1,'customer-task','p',$2)",
    [owner, JSON.stringify(task)],
  );
  const source = {
    id: "completion-source",
    partnerId: "p",
    kind: "reported note",
    author: other,
    content:
      "Customer reports all samples recorded, with attached log reference.",
  };
  const args = [
    owner,
    "p",
    "customer-task",
    1,
    3,
    other,
    "done",
    JSON.stringify(source),
    "complete-customer-task",
  ];
  await expect(
    db.query("select update_customer_trial_task($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      owner,
      "p",
      "action-ack-valid",
      1,
      3,
      other,
      "done",
      JSON.stringify(source),
      "wrong-side",
    ]),
  ).rejects.toThrow("Customer-owned");
  await expect(
    db.query("select update_customer_trial_task($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
      owner,
      "p",
      "customer-task",
      2,
      3,
      other,
      "done",
      JSON.stringify(source),
      "wrong-version",
    ]),
  ).rejects.toThrow("changed");
  await db.query(
    "select update_customer_trial_task($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    args,
  );
  await db.query(
    "select update_customer_trial_task($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    args,
  );
  const updated = await db.query<{
    payload: { status: string; version: number; completionSourceId: string };
  }>("select payload from trial_tasks where id='customer-task'");
  expect(updated.rows[0].payload).toMatchObject({
    status: "done",
    version: 2,
    completionSourceId: "completion-source",
  });
  expect(
    (
      await db.query<{ version: number }>(
        "select version from programs where id=$1",
        [owner],
      )
    ).rows[0].version,
  ).toBe(4);
});
