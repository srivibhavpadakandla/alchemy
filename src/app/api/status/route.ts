export async function GET() {
  return Response.json({
    "Local Codex": {
      configured: process.env.LOCAL_CODEX_ENABLED === "1",
      detail:
        "Optional loopback-only demo runner using an existing Codex sign-in; separate from the hosted OpenAI API",
    },
    Supabase: {
      configured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ),
      detail:
        "Google / verified email-code auth, Postgres and row-level security",
    },
    OpenAI: {
      configured: !!(
        process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL_REASONING
      ),
      detail:
        "Five bounded role tasks; exact account model support must be checked",
    },
    Gemma: {
      configured: !!process.env.GOOGLE_API_KEY,
      detail: `Evidence reviewer · ${process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it"}`,
    },
    ElevenLabs: {
      configured: !!(
        process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID
      ),
      detail: "Opt-in signed voice sessions; source and scenario tools",
    },
    Inngest: {
      configured: !!(
        process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY
      ),
      detail: "Durable role jobs and event recovery",
    },
  });
}
