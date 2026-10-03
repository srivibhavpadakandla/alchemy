import { adminClient } from "./supabase/admin";
import { StateSchema, State } from "./domain";
import { DomainError } from "./commands";
export async function readAsActor(id: string, actor: string) {
  const db = adminClient();
  const { data: membership } = await db
    .from("memberships")
    .select("role")
    .eq("program_id", id)
    .eq("user_id", actor)
    .single();
  if (!membership || membership.role === "viewer")
    throw new DomainError(
      "Editor or owner role required for provider tasks",
      403,
    );
  const { data: p, error } = await db
    .from("programs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !p) throw Error("Program unavailable");
  const collections = [
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
  ];
  const pairs = await Promise.all(
    collections.map(async (table) => {
      const { data, error } = await db
        .from(table)
        .select("payload")
        .eq("program_id", id)
        .order("version")
        .order("id");
      if (error) throw error;
      return [table, (data ?? []).map((r) => r.payload)];
    }),
  );
  const { data: receipts } = await db
    .from("mutation_receipts")
    .select("key")
    .eq("program_id", id);
  return StateSchema.parse({
    schema: "launchguild-v1",
    id,
    mode: p.mode,
    version: p.version,
    name: p.name,
    demoStart: p.demo_start,
    strategy: p.strategy,
    capacity: p.capacity,
    appliedKeys: receipts?.map((r) => r.key) ?? [],
    ...Object.fromEntries(pairs),
  });
}
export async function commitAsActor(
  s: State,
  expected: number,
  key: string,
  actor: string,
) {
  const { error } = await adminClient().rpc("commit_program", {
    p_id: s.id,
    p_expected: expected,
    p_key: key,
    p_state: s,
    p_actor: actor,
  });
  if (error) throw error;
}
