import { z } from "zod";
import { roles } from "@/lib/domain";
import { makeRun } from "@/lib/providers";
import { applyCommand, DomainError } from "@/lib/commands";
import {
  checkOrigin,
  readBody,
  loadProgram,
  saveProgram,
  apiError,
} from "@/lib/repository";
import { adminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/jobs";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = z
      .object({ programId: z.string(), role: z.enum(roles) })
      .parse(await readBody(req));
    if (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY)
      throw new DomainError(
        "Inngest setup required for durable live tasks.",
        503,
      );
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL_REASONING)
      throw new DomainError("OpenAI setup required; no task admitted.", 503);
    const { state, user } = await loadProgram(b.programId),
      run = makeRun(state, b.role),
      db = adminClient();
    const { error } = await db.rpc("reserve_usage", {
      p_id: run.id,
      p_program: state.id,
      p_actor: user.id,
      p_tokens: 20000,
    });
    if (error) throw new DomainError(error.message, 429);
    const { error: insert } = await db
      .from("job_inputs")
      .insert({
        id: run.id,
        program_id: state.id,
        actor: user.id,
        input: { state, run },
        input_hash: run.inputHash,
        role: b.role,
        status: "queued",
      });
    if (insert) throw insert;
    await saveProgram(
      applyCommand(
        state,
        { type: "run.save", run, key: run.id, expectedVersion: state.version },
        user.id,
      ),
      state.version,
      run.id,
    );
    await db
      .from("job_events")
      .insert({
        job_id: run.id,
        program_id: state.id,
        status: "queued",
        summary: "Pinned source versions; budget reserved.",
      });
    await inngest.send({
      id: run.id,
      name: "guild/role.requested",
      data: { jobId: run.id },
    });
    return Response.json({ jobId: run.id });
  } catch (e) {
    return apiError(e);
  }
}
