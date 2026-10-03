import { z } from "zod";
import { apiError, checkOrigin, loadProgram, readBody } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
import { extractFacts, IntakeSchema } from "@/lib/frontdesk-onboarding";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = z
      .object({
        mode: z.enum(["demo", "live"]),
        programId: z.string().min(1),
        partnerId: z.string().min(1),
        sourceIds: z.array(z.string()).min(1).max(4),
        demoSources: IntakeSchema.optional(),
      })
      .parse(await readBody(req));
    let sources, owner;
    const local = body.mode === "demo";
    if (local) {
      if (
        process.env.LOCAL_CODEX_ENABLED !== "1" ||
        !["localhost", "127.0.0.1"].includes(new URL(req.url).hostname)
      )
        throw new DomainError(
          "Source extraction requires an authenticated workspace or an enabled loopback sandbox.",
          403,
        );
      sources = IntakeSchema.parse(body.demoSources);
      owner = "local-frontdesk";
      if (sources.some((s) => !body.sourceIds.includes(s.id)))
        throw new DomainError(
          "Extraction source IDs do not match the saved intake.",
        );
    } else {
      const { state, client, user } = await loadProgram(body.programId);
      const { data } = await client
        .from("memberships")
        .select("role")
        .eq("program_id", state.id)
        .eq("user_id", user.id)
        .single();
      if (!data || !["owner", "editor"].includes(data.role))
        throw new DomainError("Editor permission required", 403);
      sources = state.sources
        .filter(
          (s) =>
            body.sourceIds.includes(s.id) && s.partnerId === body.partnerId,
        )
        .map(({ id, title, content }) => ({ id, title, content }));
      if (sources.length !== body.sourceIds.length)
        throw new DomainError(
          "Intake evidence is missing or outside this customer workspace.",
          403,
        );
      owner = `${user.id}:${state.id}`;
    }
    return Response.json(await extractFacts(sources, local, owner), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
