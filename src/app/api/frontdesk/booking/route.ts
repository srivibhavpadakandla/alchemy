import { apiError, checkOrigin, readBody } from "@/lib/repository";
import { BookingSchema } from "@/lib/frontdesk-booking";
import {
  executeBooking,
  frontdeskAccess,
  refreshBookingReceipt,
} from "@/lib/frontdesk-execution";
import { identity } from "@/lib/supabase/server";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const input = await readBody(req);
    if (input.action === "refresh") {
      const scope = z
        .object({
          programId: z.string().min(1).max(200),
          partnerId: z.string().min(1).max(200),
          key: z.string().uuid(),
        })
        .parse(input);
      return Response.json(
        await refreshBookingReceipt(
          scope.programId,
          scope.partnerId,
          scope.key,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const b = BookingSchema.parse(input);
    const actor = await frontdeskAccess(b.programId, b.partnerId);
    return Response.json(await executeBooking(b, actor), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function GET(req: Request) {
  try {
    const { client } = await identity(),
      params = new URL(req.url).searchParams;
    const { data, error } = await client
      .from("frontdesk_bookings")
      .select("key,partner_id,starts_at,ends_at,receipt,created_at")
      .eq("program_id", params.get("programId") ?? "")
      .eq("partner_id", params.get("partnerId") ?? "")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return Response.json(
      { bookings: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
