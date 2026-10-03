import { z } from "zod";
import {
  checkOrigin,
  readBody,
  loadProgram,
  apiError,
  saveProgram,
} from "@/lib/repository";
import { calculate, readiness, StateSchema } from "@/lib/domain";
import { applyCommand } from "@/lib/commands";
import { identity } from "@/lib/supabase/server";
const Input = z.object({
  programId: z.string(),
  mode: z.enum(["demo", "live"]),
  action: z.enum(["read_partner", "compare_capacity", "propose_plan"]),
  partnerId: z.string().optional(),
  workIds: z.array(z.string()).max(50).optional(),
  demoState: StateSchema.optional(),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = Input.parse(await readBody(req));
    await identity();
    const live = await loadProgram(b.mode === "demo" ? "default" : b.programId),
      s = b.mode === "demo" ? b.demoState : live.state;
    if (!s || s.mode !== b.mode) throw Error("Program scope mismatch");
    if (b.action === "read_partner") {
      const p = s.partners.find((p) => p.id === b.partnerId);
      if (!p) throw Error("Partner not in authorized program");
      return Response.json({
        partner: p,
        promises: s.promises.filter((x) => x.partnerId === p.id),
        readiness: readiness(p),
        sources: s.sources.filter((x) => x.partnerId === p.id),
      });
    }
    if (b.action === "compare_capacity")
      return Response.json({
        scenarios: s.work.map((w) => ({
          title: w.title,
          result: calculate(s, [w.id]),
        })),
        committed: false,
      });
    const selected = b.workIds ?? [];
    if (selected.some((id) => !s.work.some((w) => w.id === id)))
      throw Error("Work outside program");
    const command = {
      type: "scenario.save" as const,
      name: "Voice-proposed plan",
      selected,
      assumptions:
        "Voice proposal only. Founder must review and commit separately.",
      key: crypto.randomUUID(),
      expectedVersion: s.version,
    };
    if (b.mode === "live")
      await saveProgram(
        applyCommand(s, command, live.user.id),
        s.version,
        command.key,
      );
    return Response.json({
      selected,
      result: calculate(s, selected),
      command: b.mode === "demo" ? command : undefined,
      committed: false,
    });
  } catch (e) {
    return apiError(e);
  }
}
