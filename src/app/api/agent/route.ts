import { z } from "zod";
import { StateSchema, roles } from "@/lib/domain";
import { applyCommand, DomainError } from "@/lib/commands";
import { makeRun, executeRole, reviewClaim } from "@/lib/providers";
import {
  checkOrigin,
  readBody,
  loadProgram,
  saveProgram,
  apiError,
} from "@/lib/repository";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
const Schema = z.object({
  action: z.enum(["run", "review"]),
  role: z.enum(roles).optional(),
  programId: z.string(),
  mode: z.enum(["demo", "live"]),
  claim: z.string().max(4000).optional(),
  sourceIds: z.array(z.string()).max(30).optional(),
  demoState: StateSchema.optional(),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = Schema.parse(await readBody(req));
    if (b.action === "run" && b.mode === "live")
      throw new DomainError("Use durable /api/jobs for live role tasks", 400);
    if (
      b.action === "run" &&
      (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL_REASONING)
    )
      throw new DomainError(
        "OpenAI setup required: API key and supported model. No task was executed.",
        503,
      );
    if (b.action === "review" && !process.env.GOOGLE_API_KEY)
      throw new DomainError(
        "Gemma setup required: Google API key and supported Gemma model. No review was executed.",
        503,
      );
    const { user } = await identity();
    const live = await loadProgram(b.mode === "demo" ? "default" : b.programId);
    const s = b.mode === "demo" ? b.demoState : live.state;
    if (!s || s.mode !== b.mode)
      throw new DomainError("Invalid program scope", 403);
    const reservation = crypto.randomUUID(),
      admin = adminClient();
    const { error } = await admin.rpc("reserve_usage", {
      p_id: reservation,
      p_program: live.state.id,
      p_actor: user.id,
      p_tokens: 20000,
    });
    if (error) throw new DomainError(error.message, 429);
    try {
      if (b.action === "review") {
        const review = await reviewClaim(s, b.claim ?? "", b.sourceIds ?? []);
        if (b.mode === "live") {
          const fresh = (await loadProgram(s.id)).state;
          await saveProgram(
            applyCommand(
              fresh,
              {
                type: "review.add",
                review,
                key: reservation,
                expectedVersion: fresh.version,
              },
              user.id,
            ),
            fresh.version,
            reservation,
          );
        }
        return Response.json({ review });
      }
      if (!b.role) throw Error("Role is required");
      const run = makeRun(s, b.role);
      let result;
      try {
        result = await executeRole(s, run);
      } catch (e) {
        result = {
          ...run,
          status: "failed" as const,
          attempt: 1,
          error: e instanceof Error ? e.message : "Provider failed",
          updatedAt: new Date().toISOString(),
        };
      }
      if (b.mode === "live") {
        const fresh = (await loadProgram(s.id)).state;
        await saveProgram(
          applyCommand(
            fresh,
            {
              type: "run.save",
              run: result,
              key: reservation,
              expectedVersion: fresh.version,
            },
            user.id,
          ),
          fresh.version,
          reservation,
        );
      }
      return Response.json(
        {
          run: result,
          ...(result.status === "failed" ? { error: result.error } : {}),
        },
        { status: result.status === "failed" ? 502 : 200 },
      );
    } finally {
      await admin
        .from("usage_reservations")
        .update({ state: "reconciled" })
        .eq("id", reservation);
    }
  } catch (e) {
    return apiError(e);
  }
}
