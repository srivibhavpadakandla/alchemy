import { createHash, timingSafeEqual } from "node:crypto";
import { apiError, readBody } from "@/lib/repository";
import { adminClient } from "@/lib/supabase/admin";
import { BookingSchema, calendarAvailability } from "@/lib/frontdesk-booking";
import {
  executeBooking,
  approvedBookingPolicy,
} from "@/lib/frontdesk-execution";
import { DomainError } from "@/lib/commands";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    const secret = process.env.FRONTDESK_WEBHOOK_SECRET,
      supplied = req.headers.get("x-alchemy-frontdesk-key");
    const digest = (s: string) => createHash("sha256").update(s).digest();
    if (
      !secret ||
      secret.length < 32 ||
      !supplied ||
      !timingSafeEqual(digest(secret), digest(supplied))
    )
      throw new DomainError("Phone tool authentication required.", 403);
    const programId = process.env.FRONTDESK_PROGRAM_ID,
      partnerId = process.env.FRONTDESK_PARTNER_ID;
    if (!programId || !partnerId)
      throw new DomainError(
        "Phone tool customer scope is not configured.",
        503,
      );
    const db = adminClient();
    const { data: program, error: missingProgram } = await db
      .from("programs")
      .select("owner_id")
      .eq("id", programId)
      .single();
    const { data: partner, error: missingPartner } = await db
      .from("partners")
      .select("id")
      .eq("program_id", programId)
      .eq("id", partnerId)
      .single();
    if (missingProgram || !program || missingPartner || !partner)
      throw new DomainError(
        "Phone tool program or customer is unavailable.",
        503,
      );
    const input = await readBody(req);
    if (input.tool === "availability") {
      const b = z
        .object({
          start: z.string().datetime({ offset: true }),
          end: z.string().datetime({ offset: true }),
        })
        .parse(input);
      await approvedBookingPolicy(programId, partnerId, b.start, b.end);
      return Response.json(await calendarAvailability(b.start, b.end), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (input.tool !== "book") throw new DomainError("Unknown phone tool.");
    const b = BookingSchema.parse({ ...input, programId, partnerId });
    return Response.json(await executeBooking(b, program.owner_id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
