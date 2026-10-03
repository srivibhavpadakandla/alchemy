import { Inngest } from "inngest";
import { adminClient } from "./supabase/admin";
import { readAsActor, commitAsActor } from "./job-store";
import { StateSchema, RunSchema, inputHash, hash } from "./domain";
import { applyCommand } from "./commands";
import { executeRole } from "./providers";
export const inngest = new Inngest({ id: "launchguild" });
export const trialReminders = inngest.createFunction(
  {
    id: "alchemy-trial-reminders",
    retries: 3,
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }) => {
    const day = new Date().toISOString().slice(0, 10);
    const tasks = await step.run("find-overdue-trial-tasks", async () => {
      const { data, error } = await adminClient()
        .from("trial_tasks")
        .select("program_id,partner_id,id,version,payload");
      if (error) throw error;
      const { data: plans, error: planError } = await adminClient()
        .from("trial_plans")
        .select("program_id,payload");
      if (planError) throw planError;
      const current = new Map<string, number>();
      for (const p of plans ?? []) {
        const key = `${p.program_id}/${p.payload.trialId}`;
        current.set(key, Math.max(current.get(key) ?? 0, p.payload.version));
      }
      return (data ?? []).filter(
        (t) =>
          t.payload.status !== "done" &&
          t.payload.due <= day &&
          t.payload.planVersion ===
            current.get(`${t.program_id}/${t.payload.trialId}`),
      );
    });
    await step.run("persist-deduplicated-in-app-reminders", async () => {
      if (!tasks.length) return;
      const { error } = await adminClient()
        .from("trial_reminders")
        .upsert(
          tasks.map((t) => ({
            program_id: t.program_id,
            partner_id: t.partner_id,
            task_id: t.id,
            task_version: t.version,
            day,
            summary: `${t.payload.title} is due ${t.payload.due}; owner ${t.payload.assignee}.`,
          })),
          {
            onConflict: "program_id,task_id,task_version,day",
            ignoreDuplicates: true,
          },
        );
      if (error) throw error;
    });
    return { persisted: tasks.length, channel: "in-app", day };
  },
);
export const trialEndReview = inngest.createFunction(
  {
    id: "alchemy-trial-end-review",
    retries: 3,
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }) => {
    const day = new Date().toISOString().slice(0, 10);
    const due = await step.run("find-ended-trials", async () => {
      const { data, error } = await adminClient()
        .from("trial_plans")
        .select("program_id,payload");
      if (error) throw error;
      const latest = new Map<
        string,
        {
          program_id: string;
          payload: {
            id: string;
            trialId: string;
            version: number;
            end: string;
          };
        }
      >();
      for (const p of data ?? []) {
        const key = `${p.program_id}/${p.payload.trialId}`,
          old = latest.get(key);
        if (!old || old.payload.version < p.payload.version) latest.set(key, p);
      }
      return [...latest.values()].filter((p) => p.payload.end <= day);
    });
    let completed = 0;
    for (const plan of due)
      await step.run(
        `evaluate-${hash([plan.program_id, plan.payload.id]).slice(0, 24)}`,
        async () => {
          const { data: owner, error } = await adminClient()
            .from("programs")
            .select("owner_id")
            .eq("id", plan.program_id)
            .single();
          if (error || !owner) throw Error("Trial owner unavailable");
          const key = `trial-end-${hash([plan.program_id, plan.payload.id]).slice(0, 32)}`;
          for (let attempt = 0; attempt < 3; attempt++) {
            const fresh = await readAsActor(plan.program_id, owner.owner_id);
            const current = fresh.trialPlans
              .filter((p) => p.trialId === plan.payload.trialId)
              .at(-1);
            if (
              current?.id !== plan.payload.id ||
              fresh.appliedKeys.includes(key)
            )
              return;
            const next = applyCommand(
              fresh,
              {
                type: "trial.evaluate",
                trialId: current.trialId,
                key,
                expectedVersion: fresh.version,
              },
              owner.owner_id,
            );
            try {
              await commitAsActor(next, fresh.version, key, owner.owner_id);
              completed++;
              return;
            } catch (e) {
              if (
                !(e instanceof Error) ||
                !e.message.includes("version conflict")
              )
                throw e;
            }
          }
          throw Error(
            "Trial evaluation could not commit after concurrent edits",
          );
        },
      );
    return { completed, examined: due.length, day, channel: "in-app" };
  },
);
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
      await db.from("job_events").insert({
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
