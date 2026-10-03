import { identity } from "@/lib/supabase/server";
import { apiError } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
export async function GET(req: Request) {
  try {
    const { client } = await identity(),
      url = new URL(req.url),
      programId = url.searchParams.get("programId"),
      partnerId = url.searchParams.get("partnerId");
    if (!programId || !partnerId) throw new DomainError("Trial scope required");
    const { data, error } = await client
      .from("trial_reminders")
      .select("task_id,day,summary")
      .eq("program_id", programId)
      .eq("partner_id", partnerId)
      .order("day", { ascending: false })
      .limit(20);
    if (error) throw error;
    return Response.json(
      { reminders: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
