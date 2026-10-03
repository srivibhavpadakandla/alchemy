import { z } from "zod";
import { checkOrigin, readBody, loadProgram, apiError } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
import { readWebsite } from "@/lib/frontdesk-website";

export async function GET() {
  const configured = (names: string[]) =>
    names.every((name) => !!process.env[name]);
  return Response.json(
    {
      calendar: {
        configured: configured([
          "GOOGLE_CALENDAR_CLIENT_ID",
          "GOOGLE_CALENDAR_CLIENT_SECRET",
          "GOOGLE_CALENDAR_REFRESH_TOKEN",
          "GOOGLE_CALENDAR_ID",
          "FRONTDESK_PROGRAM_ID",
        ]),
        detail:
          "Google Calendar · server credentials configured separately; availability must be checked before booking.",
      },
      sms: {
        configured: configured([
          "TWILIO_ACCOUNT_SID",
          "TWILIO_AUTH_TOKEN",
          "TWILIO_FROM_NUMBER",
        ]),
        detail:
          "Twilio · each caller must opt in. A submitted message is not confirmed delivery.",
      },
      phone: {
        configured: configured([
          "ELEVENLABS_API_KEY",
          "ELEVENLABS_AGENT_ID",
          "FRONTDESK_PHONE_NUMBER",
          "FRONTDESK_WEBHOOK_SECRET",
          "FRONTDESK_PROGRAM_ID",
          "FRONTDESK_PARTNER_ID",
        ]),
        detail:
          "ElevenLabs inbound number · configure the calendar/booking webhook tools in your agent account.",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = z
      .object({
        mode: z.enum(["demo", "live"]),
        programId: z.string().min(1),
        url: z.url().max(1000),
      })
      .parse(await readBody(req));
    if (body.mode === "live") {
      const { state, client, user } = await loadProgram(body.programId);
      const { data } = await client
        .from("memberships")
        .select("role")
        .eq("program_id", state.id)
        .eq("user_id", user.id)
        .single();
      if (!data || !["owner", "editor"].includes(data.role))
        throw new DomainError("Editor permission required", 403);
    } else {
      const hostname = new URL(req.url).hostname;
      if (
        process.env.LOCAL_CODEX_ENABLED !== "1" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(hostname)
      )
        throw new DomainError(
          "Website intake requires a signed-in workspace or the enabled local sandbox.",
          403,
        );
    }
    return Response.json(await readWebsite(body.url), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
