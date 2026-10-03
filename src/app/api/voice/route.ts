import { adminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { checkOrigin, readBody, loadProgram, apiError } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = z
      .object({ programId: z.string(), mode: z.enum(["demo", "live"]) })
      .parse(await readBody(req));
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID)
      throw new DomainError(
        "ElevenLabs setup required. No microphone session has started. Text tools are available below.",
        503,
      );
    const { state, user } = await loadProgram(
      b.mode === "demo" ? "default" : b.programId,
    );
    const reservation = crypto.randomUUID();
    const { error: budgetError } = await adminClient().rpc("reserve_usage", {
      p_id: reservation,
      p_program: state.id,
      p_actor: user.id,
      p_tokens: 20000,
    });
    if (budgetError) throw new DomainError(budgetError.message, 429);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID)}`,
      {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok)
      throw Error(`ElevenLabs session request failed (${res.status})`);
    const bdy = await res.json();
    if (typeof bdy.signed_url !== "string")
      throw Error("Malformed signed voice session");
    return Response.json({
      signedUrl: bdy.signed_url,
      reservationId: reservation,
      cost: "unknown",
      maximumClientDurationSeconds: 300,
    });
  } catch (e) {
    return apiError(e);
  }
}
