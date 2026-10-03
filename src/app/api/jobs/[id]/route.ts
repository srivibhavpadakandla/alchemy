import { readAsActor } from "@/lib/job-store";
import { applyCommand } from "@/lib/commands";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { checkOrigin, apiError } from "@/lib/repository";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await identity();
    const id = (await params).id;
    const cursor = Number(new URL(req.url).searchParams.get("cursor") ?? 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0)
      throw Error("Invalid event cursor");
    const { data: job, error } = await client
      .from("job_inputs")
      .select("id,status,updated_at")
      .eq("id", id)
      .single();
    if (error || !job)
      return Response.json(
        { error: "Job not found or access denied" },
        { status: 404 },
      );
    const { data: events, error: eventsError } = await client
      .from("job_events")
      .select("*")
      .eq("job_id", id)
      .gt("sequence", cursor)
      .order("sequence")
      .limit(100);
    if (eventsError) throw eventsError;
    return Response.json({
      job,
      events,
      cursor: events?.at(-1)?.sequence ?? cursor,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { client, user } = await identity();
    const id = (await params).id;
    const { data: job } = await client
      .from("job_inputs")
      .select("*")
      .eq("id", id)
      .single();
    if (!job) throw Error("Job inaccessible");
    const { data: membership } = await client
      .from("memberships")
      .select("role")
      .eq("program_id", job.program_id)
      .eq("user_id", user.id)
      .single();
    if (!membership || membership.role === "viewer")
      throw Error("Editor permission required");
    const fresh = await readAsActor(job.program_id, user.id);
    const run = fresh.runs.find((r) => r.id === id);
    if (!run) throw Error("Task record unavailable");
    const next = applyCommand(
      fresh,
      {
        type: "run.save",
        run: { ...run, status: "cancelled" },
        key: `${id}-cancel`,
        expectedVersion: fresh.version,
      },
      user.id,
    );
    const { error } = await adminClient().rpc("cancel_job", {
      p_job: id,
      p_actor: user.id,
      p_expected: fresh.version,
      p_state: next,
    });
    if (error) throw error;
    return Response.json({
      cancelled: true,
      warning:
        "An in-flight provider call may finish; its output will be quarantined.",
    });
  } catch (e) {
    return apiError(e);
  }
}
