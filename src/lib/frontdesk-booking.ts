import { createHash } from "node:crypto";
import { z } from "zod";
import { DomainError } from "./commands";
import { hash } from "./domain";
import { readBrief } from "../components/video-inspired/brief";

export const BookingSchema = z.object({
  programId: z.string().min(1).max(200),
  partnerId: z.string().min(1).max(200),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  timeZone: z.string().max(100).default("UTC"),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .optional()
    .or(z.literal("")),
  key: z.string().uuid(),
  confirmed: z.literal(true),
  smsConsent: z.boolean().default(false),
});
export type Booking = z.infer<typeof BookingSchema>;
export type BookingReceipt = {
  status: "processing" | "confirmed" | "failed" | "uncertain";
  calendarStatus: string;
  smsStatus: string;
  eventId?: string;
  smsId?: string;
  providerCheckedAt?: string;
  smsErrorCode?: number;
  refreshError?: string;
  error?: string;
  operatorAction?: string;
  executionLeaseUntil?: string;
  operatingBriefHash?: string;
};
export const BOOKING_EXECUTION_LEASE_MS = 5 * 60 * 1000;

export function validateApprovedBookingPolicy(
  source: { content: string; hash: string },
  start: string,
  end: string,
  timeZone?: string,
) {
  const brief = readBrief(source.content);
  if (
    !brief ||
    brief.facts.some((fact) => fact.status !== "confirmed") ||
    source.hash !== hash(source.content)
  )
    throw new DomainError(
      "Save a complete reviewed operating brief before checking appointments.",
      409,
    );
  if (process.env.FRONTDESK_APPROVED_BRIEF_HASH !== source.hash)
    throw new DomainError(
      "The owner must review the latest brief's free-form business hours against server operating hours and set FRONTDESK_APPROVED_BRIEF_HASH to its source hash before booking.",
      503,
    );
  const canonicalZone = (value: string) => {
    try {
      return new Intl.DateTimeFormat("en", {
        timeZone: value,
      }).resolvedOptions().timeZone;
    } catch {
      throw new DomainError(
        "The reviewed brief and server require valid IANA time zones.",
        503,
      );
    }
  };
  const zone = canonicalZone(brief.timeZone);
  if (
    canonicalZone(process.env.FRONTDESK_TIME_ZONE || "") !== zone ||
    (timeZone && canonicalZone(timeZone) !== zone)
  )
    throw new DomainError(
      "Appointment time zone does not match the reviewed operating brief and server policy.",
      409,
    );
  if (
    (Date.parse(end) - Date.parse(start)) / 60000 !==
    brief.appointmentMinutes
  )
    throw new DomainError(
      `This reviewed operating brief requires ${brief.appointmentMinutes}-minute appointments.`,
      409,
    );
  return source.hash;
}
export function calendarConfigured() {
  return [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_REFRESH_TOKEN",
    "GOOGLE_CALENDAR_ID",
    "FRONTDESK_PROGRAM_ID",
  ].every((k) => !!process.env[k]);
}
export function smsConfigured() {
  return [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
  ].every((k) => !!process.env[k]);
}
export function validateWindow(start: string, end: string, now = Date.now()) {
  const a = Date.parse(start),
    b = Date.parse(end),
    minutes = (b - a) / 60000;
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a < now ||
    a > now + 180 * 86400000 ||
    minutes < 5 ||
    minutes > 240
  )
    throw new DomainError(
      "Choose a future appointment of 5–240 minutes within 180 days.",
    );
}
export function validateBusinessHours(start: string, end: string) {
  const zone = process.env.FRONTDESK_TIME_ZONE;
  const open = Number(process.env.FRONTDESK_OPEN_HOUR);
  const close = Number(process.env.FRONTDESK_CLOSE_HOUR);
  const days = process.env.FRONTDESK_WEEKDAYS?.split(",").map((day) =>
    day.trim(),
  );
  if (
    !zone ||
    !days?.length ||
    days.some((day) => !/^[0-6]$/.test(day)) ||
    !process.env.FRONTDESK_OPEN_HOUR?.trim() ||
    !process.env.FRONTDESK_CLOSE_HOUR?.trim() ||
    !Number.isInteger(open) ||
    !Number.isInteger(close) ||
    open < 0 ||
    close > 24 ||
    open >= close
  )
    throw new DomainError(
      "Confirm server-side business hours and time zone before booking.",
      503,
    );
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)))
    throw new DomainError("Use valid appointment dates.");
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new DomainError(
      "Confirm a valid server-side business time zone before booking.",
      503,
    );
  }
  const fields = (date: string) =>
    Object.fromEntries(
      format.formatToParts(new Date(date)).map((p) => [p.type, p.value]),
    );
  const a = fields(start),
    b = fields(end);
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    a.weekday,
  );
  if (
    !days.includes(String(day)) ||
    a.year !== b.year ||
    a.month !== b.month ||
    a.day !== b.day ||
    +a.hour * 3600 + +a.minute * 60 + +a.second < open * 3600 ||
    +b.hour * 3600 + +b.minute * 60 + +b.second > close * 3600
  )
    throw new DomainError(
      "This appointment is outside the configured business hours.",
      409,
    );
}
export function bookingHash(b: Booking) {
  return createHash("sha256").update(JSON.stringify(b)).digest("hex");
}
export function calendarEventId(programId: string, key: string) {
  return createHash("sha256").update(`${programId}:${key}`).digest("hex");
}
async function accessToken() {
  if (!calendarConfigured())
    throw new DomainError(
      "Google Calendar setup required. No appointment has been booked.",
      503,
    );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new DomainError(
      `Google authorization failed (${r.status}). Reconnect the calendar.`,
      503,
    );
  const d = await r.json();
  if (typeof d.access_token !== "string")
    throw Error("Google returned no access token.");
  return d.access_token as string;
}
export async function calendarAvailability(start: string, end: string) {
  validateWindow(start, end);
  validateBusinessHours(start, end);
  const token = await accessToken(),
    calendar = process.env.GOOGLE_CALENDAR_ID!;
  const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: start,
      timeMax: end,
      items: [{ id: calendar }],
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new DomainError(`Calendar availability failed (${r.status}).`, 503);
  const d = await r.json(),
    result = d.calendars?.[calendar];
  if (
    !result ||
    result.errors?.length ||
    !Array.isArray(result.busy) ||
    result.busy.some(
      (slot: { start?: unknown; end?: unknown }) =>
        typeof slot.start !== "string" ||
        typeof slot.end !== "string" ||
        !Number.isFinite(Date.parse(slot.start)) ||
        !Number.isFinite(Date.parse(slot.end)) ||
        Date.parse(slot.end) <= Date.parse(slot.start),
    )
  )
    throw new DomainError("Calendar availability could not be verified.", 503);
  return {
    available: !result.busy.some(
      (slot: { start: string; end: string }) =>
        Date.parse(slot.start) < Date.parse(end) &&
        Date.parse(slot.end) > Date.parse(start),
    ),
    checkedAt: new Date().toISOString(),
    provider: "Google Calendar",
  };
}
export async function createCalendarBooking(b: Booking) {
  const token = await accessToken(),
    id = calendarEventId(b.programId, b.key);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}/events`;
  const payload = {
    id,
    summary: `Alchemy trial meeting · ${b.name}`,
    description: `Customer requested trial kickoff/review. Contact: ${b.email}. Booking key: ${b.key}.`,
    start: { dateTime: b.start, timeZone: b.timeZone },
    end: { dateTime: b.end, timeZone: b.timeZone },
    extendedProperties: {
      private: {
        alchemyKey: b.key,
        alchemyProgram: b.programId,
        alchemyPartner: b.partnerId,
      },
    },
  };
  const r = await fetch(`${url}?sendUpdates=none`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (r.status === 409) {
    const existing = await fetch(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!existing.ok) throw Error("Calendar conflict requires reconciliation.");
    const event = await existing.json();
    if (
      event.extendedProperties?.private?.alchemyKey !== b.key ||
      event.extendedProperties?.private?.alchemyProgram !== b.programId ||
      event.extendedProperties?.private?.alchemyPartner !== b.partnerId ||
      Date.parse(event.start?.dateTime) !== Date.parse(b.start) ||
      Date.parse(event.end?.dateTime) !== Date.parse(b.end) ||
      event.id !== id ||
      event.status !== "confirmed"
    )
      throw Error("Existing calendar event differs; operator review required.");
    return { id, status: "confirmed" };
  }
  if (!r.ok)
    throw new DomainError(
      `Calendar booking rejected (${r.status}).`,
      r.status >= 500 ? 503 : 400,
    );
  const event = await r.json();
  if (
    event.id !== id ||
    event.status !== "confirmed" ||
    Date.parse(event.start?.dateTime) !== Date.parse(b.start) ||
    Date.parse(event.end?.dateTime) !== Date.parse(b.end) ||
    event.extendedProperties?.private?.alchemyKey !== b.key ||
    event.extendedProperties?.private?.alchemyProgram !== b.programId ||
    event.extendedProperties?.private?.alchemyPartner !== b.partnerId
  )
    throw Error("Calendar returned an unverified booking receipt.");
  return { id, status: "confirmed" };
}
export async function sendBookingSms(b: Booking) {
  if (!b.smsConsent || !b.phone)
    throw new DomainError("SMS consent and a valid phone number are required.");
  if (!smsConfigured())
    throw new DomainError(
      "SMS setup required; the calendar booking remains separate.",
      503,
    );
  const sid = process.env.TWILIO_ACCOUNT_SID!,
    auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN!}`).toString(
      "base64",
    );
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: b.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(b.start));
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: b.phone,
        From: process.env.TWILIO_FROM_NUMBER!,
        Body: `Alchemy: your trial meeting is booked for ${time} (${b.timeZone}).`,
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (!r.ok)
    throw new DomainError(
      `SMS request rejected (${r.status}).`,
      r.status >= 500 ? 503 : 400,
    );
  const d = await r.json();
  if (
    typeof d.sid !== "string" ||
    !/^SM[0-9a-f]{32}$/i.test(d.sid) ||
    !outboundSmsStatuses.has(d.status)
  )
    throw Error(
      "SMS returned an unverified receipt; do not resend automatically.",
    );
  return { id: d.sid, status: d.status };
}

const outboundSmsStatuses = new Set([
  "accepted",
  "scheduled",
  "canceled",
  "queued",
  "sending",
  "sent",
  "failed",
  "delivered",
  "undelivered",
]);

export async function fetchBookingSms(id: string) {
  if (!/^SM[0-9a-f]{32}$/i.test(id))
    throw new DomainError("Invalid SMS receipt.");
  if (!smsConfigured())
    throw new DomainError("Reconnect SMS to check delivery.", 503);
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages/${id}.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN!}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (!r.ok)
    throw new DomainError(`SMS delivery lookup failed (${r.status}).`, 503);
  const d = await r.json();
  if (
    d.sid !== id ||
    d.account_sid !== sid ||
    !outboundSmsStatuses.has(d.status)
  )
    throw new DomainError("SMS delivery receipt could not be verified.", 503);
  return {
    id,
    status: d.status as string,
    errorCode: typeof d.error_code === "number" ? d.error_code : undefined,
  };
}

export async function fetchCalendarBooking(
  b: Pick<Booking, "programId" | "partnerId" | "key" | "start" | "end">,
) {
  const token = await accessToken(),
    id = calendarEventId(b.programId, b.key);
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}/events/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (r.status === 404 || r.status === 410) return { id, status: "not found" };
  if (!r.ok)
    throw new DomainError(`Calendar receipt lookup failed (${r.status}).`, 503);
  const event = await r.json();
  if (
    event.id !== id ||
    event.extendedProperties?.private?.alchemyKey !== b.key ||
    event.extendedProperties?.private?.alchemyProgram !== b.programId ||
    event.extendedProperties?.private?.alchemyPartner !== b.partnerId ||
    Date.parse(event.start?.dateTime) !== Date.parse(b.start) ||
    Date.parse(event.end?.dateTime) !== Date.parse(b.end) ||
    !["confirmed", "cancelled", "tentative"].includes(event.status)
  )
    throw new DomainError(
      "Calendar event differs from the saved booking; operator review required.",
      503,
    );
  return { id, status: event.status as string };
}
