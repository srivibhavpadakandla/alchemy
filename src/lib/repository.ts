import { adminClient } from "./supabase/admin";
import { identity } from "./supabase/server";
import { State, StateSchema, emptyState } from "./domain";
import { DomainError } from "./commands";
export async function loadProgram(id: string) {
  const { client, user } = await identity();
  const programId = id === "default" ? user.id : id;
  const { data, error } = await client.rpc("read_program", { p_id: programId });
  if (error) throw new DomainError(error.message, 403);
  if (data) return { state: StateSchema.parse(data), client, user };
  if (programId !== user.id)
    throw new DomainError("Program not found or access denied", 403);
  const state = emptyState("live", programId);
  const { error: createError } = await adminClient().rpc("create_program", {
    p_state: state,
    p_actor: user.id,
  });
  if (createError) throw new DomainError(createError.message, 403);
  return { state, client, user };
}
export async function saveProgram(
  state: State,
  expectedVersion: number,
  key: string,
) {
  const { client, user } = await identity();
  const { error } = await adminClient().rpc("commit_program", {
    p_id: state.id,
    p_expected: expectedVersion,
    p_key: key,
    p_state: state,
    p_actor: user.id,
  });
  if (error)
    throw new DomainError(
      error.message,
      error.message.includes("conflict") ? 409 : 403,
    );
  const { data, error: readError } = await client.rpc("read_program", {
    p_id: state.id,
  });
  if (readError) throw readError;
  return StateSchema.parse(data);
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new DomainError("Same-origin requests only", 403);
}
export async function readBody(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 1_000_000)
    throw new DomainError("Request exceeds 1 MB limit", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new DomainError("Request body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new DomainError("Request exceeds 1 MB limit", 413);
    }
    chunks.push(part.value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}
export function apiError(e: unknown) {
  return Response.json(
    { error: e instanceof Error ? e.message : "Operation failed" },
    {
      status:
        e instanceof DomainError
          ? e.status
          : e instanceof Error && e.message.includes("Sign in")
            ? 401
            : 400,
    },
  );
}
