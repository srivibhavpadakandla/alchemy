import { Inngest } from "inngest";
import { adminClient } from "./supabase/admin";
import { readAsActor, commitAsActor } from "./job-store";
import { StateSchema, RunSchema, inputHash } from "./domain";
import { applyCommand } from "./commands";
import { executeRole } from "./providers";
export const inngest = new Inngest({ id: "launchguild" });
export const roleJob = inngest.createFunction(
  {
    id: "guild-role-task",
    retries: 2,
    concurrency: 3,
    triggers: [{ event: "guild/role.requested" }],
  },
  async ({ event, step }) => {
    const jobId = String(event.data.jobId);
    const job = await step.run("load-pinned-input", async () => {
      const { data, error } = await adminClient()
        .from("job_inputs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (error || !data) throw Error("Job input missing");
      await readAsActor(data.program_id, data.actor);
      return data;
    });
    if (job.status === "cancelled") return { status: "cancelled" };
    const run = RunSchema.parse(job.input.run),
      s = StateSchema.parse(job.input.state);
    await step.run("record-working", async () => {
      const db = adminClient();
      await db
        .from("job_inputs")
        .update({ status: "working", updated_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "queued");
      const fresh = await readAsActor(job.program_id, job.actor);
      await commitAsActor(
        applyCommand(
          fresh,
          {
            type: "run.save",
            run: { ...run, status: "working" },
            key: `${jobId}-working`,
            expectedVersion: fresh.version,
          },
          job.actor,
        ),
        fresh.version,
        `${jobId}-working`,
        job.actor,
      );
      await db
        .from("job_events")
        .insert({
          job_id: jobId,
          program_id: job.program_id,
          status: "working",
          summary: "Reading pinned versions; no customer action authorized.",
        });
    });
    const result = await step.run("bounded-provider-call", async () => {
      try {
        return await executeRole(s, run);
      } catch (e) {
        return {
          ...run,
          status: "failed" as const,
          error: e instanceof Error ? e.message : "Provider failed",
          attempt: 1,
          updatedAt: new Date().toISOString(),
        };
      }
    });
    return await step.run("commit-or-quarantine-output", async () => {
      const db = adminClient();
      for (let attempt = 0; attempt < 3; attempt++) {
        const fresh = await readAsActor(job.program_id, job.actor);
        const { data: latest } = await db
          .from("job_inputs")
          .select("status")
          .eq("id", jobId)
          .single();
        const final = {
          ...result,
          status:
            latest?.status === "cancelled" || inputHash(fresh) !== run.inputHash
              ? ("quarantined" as const)
              : result.status,
        };
        const next = applyCommand(
          fresh,
          {
            type: "run.save",
            run: final,
            key: `${jobId}-result`,
            expectedVersion: fresh.version,
          },
          job.actor,
        );
        const { error } = await db.rpc("finish_job", {
          p_job: jobId,
          p_expected: fresh.version,
          p_state: next,
          p_status: final.status,
        });
        if (!error) {
          await db
            .from("usage_reservations")
            .update({ state: "reconciled", tokens: final.tokens ?? 20000 })
            .eq("id", jobId);
          return { status: final.status };
        }
        if (!error.message.includes("version conflict")) throw error;
      }
      throw Error("Concurrent changes prevented output commit; retry required");
    });
  },
);
