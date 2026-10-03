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
  for (const migration of [
    "001_launchguild.sql",
    "002_sharing_and_jobs.sql",
    "003_job_finish.sql",
    "004_cancel_job.sql",
  ])
    await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
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
