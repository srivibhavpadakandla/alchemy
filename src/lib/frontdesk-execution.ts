import { adminClient } from "./supabase/admin";
import { identity } from "./supabase/server";
import { DomainError } from "./commands";
import {
  Booking,
  BookingReceipt,
  bookingHash,
  calendarAvailability,
  calendarConfigured,
  createCalendarBooking,
  sendBookingSms,
  smsConfigured,
  validateWindow,
  validateBusinessHours,
  fetchCalendarBooking,
  fetchBookingSms,
  BOOKING_EXECUTION_LEASE_MS,
  validateApprovedBookingPolicy,
} from "./frontdesk-booking";
import { BRIEF_TITLE } from "../components/video-inspired/brief";

export async function approvedBookingPolicy(
  programId: string,
  partnerId: string,
  start: string,
  end: string,
  timeZone?: string,
) {
  const { data, error } = await adminClient()
    .from("sources")
    .select("id,payload")
    .eq("program_id", programId)
    .eq("partner_id", partnerId)
    .eq("payload->>title", BRIEF_TITLE)
    .order("payload->>recordedAt", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (
    error ||
    !data?.payload ||
    typeof data.payload.content !== "string" ||
    typeof data.payload.hash !== "string"
  )
    throw new DomainError(
      "No reviewed operating brief exists for this customer. Availability was not checked.",
      409,
    );
  return validateApprovedBookingPolicy(data.payload, start, end, timeZone);
}

export async function frontdeskAccess(programId: string, partnerId: string) {
  if (!calendarConfigured() || programId !== process.env.FRONTDESK_PROGRAM_ID)
    throw new DomainError(
      "Connect the calendar to this live program before booking.",
      503,
    );
  const { user, client } = await identity();
  const { data, error } = await client
    .from("memberships")
    .select("role,partner_id")
    .eq("program_id", programId)
    .eq("user_id", user.id)
    .single();
  if (
    error ||
    !data ||
    !(
      ["owner", "editor"].includes(data.role) ||
      (data.role === "customer" && data.partner_id === partnerId)
    )
  )
    throw new DomainError("Booking access denied.", 403);
  const { data: partner, error: missing } = await adminClient()
    .from("partners")
    .select("id")
    .eq("program_id", programId)
    .eq("id", partnerId)
    .single();
  if (missing || !partner) throw new DomainError("Customer not found.", 403);
  return user.id;
}
export async function executeBooking(b: Booking, actorId: string) {
  validateWindow(b.start, b.end);
  validateBusinessHours(b.start, b.end);
  if (b.programId !== process.env.FRONTDESK_PROGRAM_ID || !calendarConfigured())
    throw new DomainError("Calendar is not configured for this program.", 503);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: b.timeZone });
  } catch {
    throw new DomainError("Use a valid IANA time zone.");
  }
  if (b.smsConsent && (!b.phone || !smsConfigured()))
    throw new DomainError(
      "Connect SMS and supply a phone number before requesting SMS confirmation.",
      503,
    );
  const db = adminClient();
  const operatingBriefHash = await approvedBookingPolicy(
    b.programId,
    b.partnerId,
    b.start,
    b.end,
    b.timeZone,
  );
  const { data, error } = await db.rpc("reserve_frontdesk_booking", {
    p_program: b.programId,
    p_partner: b.partnerId,
    p_actor: actorId,
    p_key: b.key,
    p_hash: bookingHash(b),
    p_start: b.start,
    p_end: b.end,
  });
  if (error)
    throw new DomainError(
      error.message,
      error.message.includes("access") ? 403 : 409,
    );
  if (!data?.acquired) return data.receipt as BookingReceipt;
  if (!data.receipt)
    throw new DomainError(
      "The booking reservation did not return its durable execution receipt. Apply the current booking migration before execution.",
      503,
    );
  let storedReceipt = data.receipt as BookingReceipt;
  let receipt: BookingReceipt = {
    status: "processing",
    calendarStatus: "not attempted",
    smsStatus: b.smsConsent ? "not attempted" : "not requested",
    executionLeaseUntil: new Date(
      Date.now() + BOOKING_EXECUTION_LEASE_MS,
    ).toISOString(),
    operatingBriefHash,
  };
  const persist = async () => {
    const { data: written, error: e } = await db
      .from("frontdesk_bookings")
      .update({ receipt, updated_at: new Date().toISOString() })
      .eq("program_id", b.programId)
      .eq("key", b.key)
      .eq("receipt", JSON.stringify(storedReceipt))
      .select("receipt")
      .maybeSingle();
    if (e || !written)
      throw Error(
        "Booking receipt save failed. Do not retry with a new key; reconcile with the calendar.",
      );
    storedReceipt = JSON.parse(JSON.stringify(receipt)) as BookingReceipt;
  };
  await persist();
  try {
    const available = await calendarAvailability(b.start, b.end);
    if (!available.available) {
      receipt = {
        ...receipt,
        status: "failed",
        calendarStatus: "unavailable",
        error: "The selected appointment is busy.",
        executionLeaseUntil: undefined,
      };
      await persist();
      return receipt;
    }
  } catch (e) {
    receipt = {
      ...receipt,
      status: "failed",
      calendarStatus: "availability failed",
      error: e instanceof Error ? e.message : "Calendar check failed.",
      executionLeaseUntil: undefined,
    };
    await persist();
    return receipt;
  }
  try {
    const event = await createCalendarBooking(b);
    receipt = {
      ...receipt,
      status: "confirmed",
      calendarStatus: "confirmed",
      eventId: event.id,
    };
  } catch (e) {
    receipt = {
      ...receipt,
      status:
        e instanceof DomainError && e.status === 400 ? "failed" : "uncertain",
      calendarStatus: "not confirmed",
      error:
        e instanceof Error
          ? e.message
          : "Booking outcome uncertain. Do not retry with a new key.",
      executionLeaseUntil: undefined,
      operatorAction:
        e instanceof DomainError && e.status === 400
          ? undefined
          : "Reconcile the original booking key in Google Calendar before any new booking or SMS. This slot remains held while the outcome is uncertain.",
    };
    await persist();
    return receipt;
  }
  if (!b.smsConsent) receipt.executionLeaseUntil = undefined;
  await persist();
  if (b.smsConsent) {
    receipt = {
      ...receipt,
      smsStatus: "attempting",
      executionLeaseUntil: new Date(
        Date.now() + BOOKING_EXECUTION_LEASE_MS,
      ).toISOString(),
    };
    await persist();
    try {
      const sms = await sendBookingSms(b);
      receipt = { ...receipt, smsId: sms.id, smsStatus: sms.status };
    } catch (e) {
      receipt = {
        ...receipt,
        smsStatus:
          e instanceof DomainError && e.status === 400 ? "failed" : "uncertain",
        error:
          e instanceof Error
            ? e.message
            : "SMS outcome uncertain. Do not resend automatically.",
        operatorAction:
          "Review the original request in Twilio before any replacement confirmation. No automatic SMS retry is permitted.",
      };
    }
    receipt.executionLeaseUntil = undefined;
    await persist();
  }
  return receipt;
}

export async function refreshBookingReceipt(
  programId: string,
  partnerId: string,
  key: string,
) {
  await frontdeskAccess(programId, partnerId);
  const { client } = await identity();
  const { data: row, error } = await client
    .from("frontdesk_bookings")
    .select("key,partner_id,starts_at,ends_at,receipt,updated_at,created_at")
    .eq("program_id", programId)
    .eq("partner_id", partnerId)
    .eq("key", key)
    .single();
  if (error || !row)
    throw new DomainError("Booking receipt not found or access denied.", 403);
  const previous = row.receipt as BookingReceipt;
  // An active execution owns its receipt. Avoid racing an in-flight event or SMS request.
  const active =
    previous.status === "processing" ||
    previous.smsStatus === "attempting" ||
    !!previous.executionLeaseUntil;
  const leaseUntil = previous.executionLeaseUntil
    ? Date.parse(previous.executionLeaseUntil)
    : Date.parse(row.created_at || row.updated_at) + BOOKING_EXECUTION_LEASE_MS;
  if (active && (!Number.isFinite(leaseUntil) || Date.now() < leaseUntil))
    return previous;
  let receipt: BookingReceipt = { ...previous };
  receipt.executionLeaseUntil = undefined;
  const errors: string[] = [];
  if (previous.status !== "failed") {
    try {
      const calendar = await fetchCalendarBooking({
        programId,
        partnerId,
        key,
        start: row.starts_at,
        end: row.ends_at,
      });
      if (calendar.status === "confirmed") {
        receipt = {
          ...receipt,
          status: "confirmed",
          calendarStatus: "confirmed",
          eventId: calendar.id,
          error: previous.status === "confirmed" ? receipt.error : undefined,
          operatorAction: undefined,
        };
      } else {
        receipt = {
          ...receipt,
          status: "uncertain",
          calendarStatus: calendar.status,
          operatorAction:
            "The provider did not confirm this saved booking. Verify deletion/cancellation and reconcile this original booking in Google Calendar. The slot remains held; no automatic cancellation or release was inferred.",
        };
      }
    } catch (e) {
      errors.push(
        e instanceof Error ? e.message : "Calendar receipt lookup failed.",
      );
      receipt.operatorAction =
        "Provider reconciliation is required. This reservation remains held; do not create another booking for the same appointment.";
    }
  }
  if (previous.smsId) {
    try {
      const sms = await fetchBookingSms(previous.smsId);
      receipt = {
        ...receipt,
        smsStatus: sms.status,
        smsErrorCode: sms.errorCode,
      };
    } catch (e) {
      errors.push(
        e instanceof Error ? e.message : "SMS delivery lookup failed.",
      );
    }
  } else if (["attempting", "uncertain"].includes(previous.smsStatus)) {
    receipt.smsStatus = "uncertain";
    errors.push(
      "SMS outcome is unknown because no provider receipt was saved. Do not resend automatically.",
    );
    receipt.operatorAction =
      "Locate the original SMS request in Twilio before sending any replacement confirmation; saved receipt is missing.";
  } else if (
    receipt.status === "confirmed" &&
    previous.smsStatus === "not attempted"
  ) {
    receipt.operatorAction =
      "Calendar confirmation was recovered, but no SMS confirmation was attempted. Have the owner review the original caller consent/contact and coordinate confirmation; refresh never sends messages.";
  }
  receipt.providerCheckedAt = new Date().toISOString();
  receipt.refreshError = errors.length ? errors.join(" ") : undefined;
  const { data: updated, error: saveError } = await adminClient()
    .from("frontdesk_bookings")
    .update({ receipt, updated_at: new Date().toISOString() })
    .eq("program_id", programId)
    .eq("partner_id", partnerId)
    .eq("key", key)
    .eq("receipt", JSON.stringify(previous))
    .select("receipt")
    .maybeSingle();
  if (saveError)
    throw new DomainError(
      "Provider status was checked but the refreshed receipt could not be saved.",
      503,
    );
  if (updated) return updated.receipt as BookingReceipt;
  const { data: current, error: rereadError } = await client
    .from("frontdesk_bookings")
    .select("receipt")
    .eq("program_id", programId)
    .eq("partner_id", partnerId)
    .eq("key", key)
    .single();
  if (rereadError || !current)
    throw new DomainError(
      "Booking receipt changed during refresh. Reload its history.",
      409,
    );
  return current.receipt as BookingReceipt;
}
