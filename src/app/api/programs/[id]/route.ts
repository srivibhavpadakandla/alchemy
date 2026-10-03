import {
  loadProgram,
  saveProgram,
  checkOrigin,
  readBody,
  apiError,
} from "@/lib/repository";
import { applyCommand, CommandSchema, DomainError } from "@/lib/commands";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json((await loadProgram((await params).id)).state);
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const command = CommandSchema.parse(await readBody(req));
    if (["run.save", "review.add"].includes(command.type))
      throw new DomainError(
        "Provider receipts may only be written by the server",
        403,
      );
    const { state, user } = await loadProgram((await params).id);
    const next = applyCommand(state, command, user.id);
    return Response.json(await saveProgram(next, state.version, command.key));
  } catch (e) {
    return apiError(e);
  }
}
