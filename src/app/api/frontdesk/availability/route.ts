import { apiError } from "@/lib/repository";
import {
  frontdeskAccess,
  approvedBookingPolicy,
} from "@/lib/frontdesk-execution";
import { calendarAvailability } from "@/lib/frontdesk-booking";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const b = z
      .object({
        programId: z.string().min(1),
        partnerId: z.string().min(1),
        start: z.string().datetime({ offset: true }),
        end: z.string().datetime({ offset: true }),
      })
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    await frontdeskAccess(b.programId, b.partnerId);
    await approvedBookingPolicy(b.programId, b.partnerId, b.start, b.end);
    return Response.json(await calendarAvailability(b.start, b.end), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
