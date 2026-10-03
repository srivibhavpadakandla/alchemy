import { z } from "zod";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { hash, SourceSchema } from "@/lib/domain";
import { apiError, checkOrigin, readBody } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
type Context = { params: Promise<{ programId: string; partnerId: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    const { programId, partnerId } = await params;
    const { client } = await identity();
    const { data, error } = await client.rpc("read_trial", {
      p_program: programId,
      p_partner: partnerId,
    });
    if (error || !data)
      throw new DomainError("Trial not found or access denied", 403);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request, { params }: Context) {
  try {
    checkOrigin(req);
    const { programId, partnerId } = await params;
    const { user, client } = await identity();
    const common = {
      expectedVersion: z.number().int().positive(),
      key: z.string().uuid(),
      comment: z.string().min(5).max(4000),
    };
    const b = z
      .union([
        z.object({
          ...common,
          action: z.literal("task"),
          taskId: z.string().min(1),
          taskVersion: z.number().int().positive(),
          status: z.enum(["working", "blocked", "done"]),
        }),
        z.object({
          ...common,
          action: z.literal("acknowledge").optional(),
          planId: z.string().min(1),
        }),
      ])
      .parse(await readBody(req));
    const { data, error } = await client.rpc("read_trial", {
      p_program: programId,
      p_partner: partnerId,
    });
    if (error || !data)
      throw new DomainError("Trial not found or access denied", 403);
    const isTask = b.action === "task";
    const content =
        b.action === "task"
          ? `Customer reported task ${b.taskId} as ${b.status}. ${b.comment}`
          : `I reviewed trial plan ${b.planId}. ${b.comment}`,
      now = new Date().toISOString();
    const source = SourceSchema.parse({
      id: crypto.randomUUID(),
      partnerId,
      version: 1,
      kind: isTask ? "reported note" : "direct acknowledgment",
      title: isTask ? "Customer task update" : "Customer plan acknowledgment",
      content,
      author: user.id,
      occurredAt: now.slice(0, 10),
      recordedAt: now,
      hash: hash(content),
      scope: "program members",
      quoteStart: 0,
      quoteEnd: content.length,
    });
    const args = {
      p_program: programId,
      p_partner: partnerId,
      p_expected: b.expectedVersion,
      p_actor: user.id,
      p_source: source,
      p_key: b.key,
    };
    const { error: ack } =
      b.action === "task"
        ? await adminClient().rpc("update_customer_trial_task", {
            ...args,
            p_task: b.taskId,
            p_task_version: b.taskVersion,
            p_status: b.status,
          })
        : await adminClient().rpc("acknowledge_trial", {
            ...args,
            p_plan: b.planId,
          });
    if (ack)
      throw new DomainError(
        ack.message,
        ack.message.includes("version") || ack.message.includes("changed")
          ? 409
          : 403,
      );
    return GET(req, { params });
  } catch (e) {
    return apiError(e);
  }
}
