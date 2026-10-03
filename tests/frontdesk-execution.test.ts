import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  availability: vi.fn(),
  create: vi.fn(),
  sms: vi.fn(),
  calendarReceipt: vi.fn(),
  smsReceipt: vi.fn(),
  rows: {} as Record<string, unknown>,
  writes: [] as Record<string, unknown>[],
  writeError: null as unknown,
  writeConflict: false,
}));
vi.mock("../src/lib/frontdesk-booking", async (original) => ({
  ...(await original<object>()),
  calendarAvailability: mock.availability,
  createCalendarBooking: mock.create,
  sendBookingSms: mock.sms,
  fetchCalendarBooking: mock.calendarReceipt,
  fetchBookingSms: mock.smsReceipt,
}));
function client() {
  return {
    rpc: mock.rpc,
    from(table: string) {
      let update: unknown;
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        update(value: Record<string, unknown>) {
          update = value;
          mock.writes.push(structuredClone(value));
          return chain;
        },
        single() {
          return Promise.resolve({ data: mock.rows[table], error: null });
        },
        maybeSingle() {
          return Promise.resolve({
            data: mock.writeConflict ? null : update,
            error: mock.writeError,
          });
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({ data: null, error: mock.writeError }).then(
            resolve,
          );
        },
      };
      return chain;
    },
  };
}
vi.mock("../src/lib/supabase/admin", () => ({ adminClient: client }));
vi.mock("../src/lib/supabase/server", () => ({
  identity: async () => ({ user: { id: "actor" }, client: client() }),
}));
import { BookingSchema } from "../src/lib/frontdesk-booking";
import { hash } from "../src/lib/domain";
import { blankBrief } from "../src/components/video-inspired/brief";
import {
  executeBooking,
  refreshBookingReceipt,
} from "../src/lib/frontdesk-execution";
const booking = () =>
  BookingSchema.parse({
    programId: "program",
    partnerId: "customer",
    start: "2027-01-04T10:00:00Z",
    end: "2027-01-04T10:30:00Z",
    name: "Example",
    email: "example@example.com",
    phone: "+15555550123",
    key: "6c22b88b-2a43-4868-a6bb-f1a5f83a2426",
    confirmed: true,
    smsConsent: true,
  });
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T00:00:00Z"));
  for (const fn of [
    mock.rpc,
    mock.availability,
    mock.create,
    mock.sms,
    mock.calendarReceipt,
    mock.smsReceipt,
  ])
    fn.mockReset();
  mock.writes.length = 0;
  mock.writeError = null;
  mock.writeConflict = false;
  mock.rows = {};
  const content = JSON.stringify({
    ...blankBrief,
    trade: "Services",
    timeZone: "UTC",
    businessHours: "Monday-Friday 9am-5pm",
  });
  mock.rows.sources = { payload: { content, hash: hash(content) } };
  vi.stubEnv("FRONTDESK_APPROVED_BRIEF_HASH", hash(content));
  for (const key of [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_REFRESH_TOKEN",
    "GOOGLE_CALENDAR_ID",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
  ])
    vi.stubEnv(key, "test-only");
  vi.stubEnv("FRONTDESK_PROGRAM_ID", "program");
  vi.stubEnv("FRONTDESK_TIME_ZONE", "UTC");
  vi.stubEnv("FRONTDESK_OPEN_HOUR", "9");
  vi.stubEnv("FRONTDESK_CLOSE_HOUR", "17");
  vi.stubEnv("FRONTDESK_WEEKDAYS", "1,2,3,4,5");
  mock.rpc.mockResolvedValue({
    data: {
      acquired: true,
      receipt: {
        status: "processing",
        calendarStatus: "not attempted",
        smsStatus: "not attempted",
        executionLeaseUntil: "2026-10-03T00:05:00.000Z",
      },
    },
    error: null,
  });
  mock.availability.mockResolvedValue({ available: true });
  mock.create.mockResolvedValue({ id: "event", status: "confirmed" });
  mock.sms.mockResolvedValue({ id: "SM" + "a".repeat(32), status: "queued" });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("a replay returns its durable receipt without rechecking or resending", async () => {
  const receipt = {
    status: "confirmed",
    calendarStatus: "confirmed",
    smsStatus: "queued",
    smsId: "SM" + "a".repeat(32),
  };
  mock.rpc.mockResolvedValue({
    data: { acquired: false, receipt },
    error: null,
  });
  expect(await executeBooking(booking(), "actor")).toEqual(receipt);
  expect(mock.availability).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.sms).not.toHaveBeenCalled();
});
it("a busy slot creates no event or notification", async () => {
  mock.availability.mockResolvedValue({ available: false });
  expect(await executeBooking(booking(), "actor")).toMatchObject({
    status: "failed",
    calendarStatus: "unavailable",
  });
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.sms).not.toHaveBeenCalled();
});
it("a calendar timeout remains uncertain and never sends a confirmation SMS", async () => {
  mock.create.mockRejectedValue(new Error("Timed out"));
  expect(await executeBooking(booking(), "actor")).toMatchObject({
    status: "uncertain",
    calendarStatus: "not confirmed",
    smsStatus: "not attempted",
  });
  expect(mock.sms).not.toHaveBeenCalled();
});
it("a failed receipt save after calendar insertion prevents SMS sending", async () => {
  mock.create.mockImplementation(async () => {
    mock.writeError = { message: "database unavailable" };
    return { id: "event", status: "confirmed" };
  });
  await expect(executeBooking(booking(), "actor")).rejects.toThrow("reconcile");
  expect(mock.create).toHaveBeenCalledTimes(1);
  expect(mock.sms).not.toHaveBeenCalled();
});
it("saves the SMS attempt before sending and preserves uncertainty without resending", async () => {
  mock.sms.mockRejectedValue(new Error("Timed out after request"));
  expect(await executeBooking(booking(), "actor")).toMatchObject({
    status: "confirmed",
    smsStatus: "uncertain",
  });
  expect(
    mock.writes.map((w) => (w.receipt as { smsStatus: string }).smsStatus),
  ).toEqual(["not attempted", "not attempted", "attempting", "uncertain"]);
  expect(mock.sms).toHaveBeenCalledTimes(1);
});
function receiptRow(receipt: unknown) {
  mock.rows.memberships = { role: "customer", partner_id: "customer" };
  mock.rows.partners = { id: "customer" };
  mock.rows.frontdesk_bookings = {
    key: booking().key,
    partner_id: "customer",
    starts_at: booking().start,
    ends_at: booking().end,
    receipt,
    updated_at: "2026-10-02T23:00:00Z",
  };
}
it("a refresh reconciles saved provider IDs without new appointments or messages", async () => {
  receiptRow({
    status: "uncertain",
    calendarStatus: "not confirmed",
    smsStatus: "queued",
    smsId: "SM" + "a".repeat(32),
    error: "old timeout",
  });
  mock.calendarReceipt.mockResolvedValue({ id: "event", status: "confirmed" });
  mock.smsReceipt.mockResolvedValue({ status: "delivered" });
  expect(
    await refreshBookingReceipt("program", "customer", booking().key),
  ).toMatchObject({
    status: "confirmed",
    smsStatus: "delivered",
    providerCheckedAt: "2026-10-03T00:00:00.000Z",
  });
  expect(mock.sms).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
});
it("receipt refresh denies customer scope mismatch before querying providers", async () => {
  receiptRow({
    status: "confirmed",
    calendarStatus: "confirmed",
    smsStatus: "queued",
  });
  mock.rows.memberships = { role: "customer", partner_id: "other-customer" };
  await expect(
    refreshBookingReceipt("program", "customer", booking().key),
  ).rejects.toThrow("access denied");
  expect(mock.calendarReceipt).not.toHaveBeenCalled();
  expect(mock.smsReceipt).not.toHaveBeenCalled();
});
it("a stale SMS attempt without a receipt becomes uncertain and is never retried", async () => {
  receiptRow({
    status: "confirmed",
    calendarStatus: "confirmed",
    smsStatus: "attempting",
  });
  mock.calendarReceipt.mockResolvedValue({ id: "event", status: "confirmed" });
  expect(
    await refreshBookingReceipt("program", "customer", booking().key),
  ).toMatchObject({
    smsStatus: "uncertain",
    refreshError: expect.stringContaining("Do not resend"),
  });
  expect(mock.sms).not.toHaveBeenCalled();
  expect(mock.smsReceipt).not.toHaveBeenCalled();
});

it("does not refresh an active provider chain after the old 30-second threshold", async () => {
  const receipt = {
    status: "processing",
    calendarStatus: "not attempted",
    smsStatus: "not attempted",
    executionLeaseUntil: "2026-10-03T00:05:00.000Z",
  };
  receiptRow(receipt);
  vi.setSystemTime(new Date("2026-10-03T00:01:30Z"));
  expect(
    await refreshBookingReceipt("program", "customer", booking().key),
  ).toEqual(receipt);
  expect(mock.calendarReceipt).not.toHaveBeenCalled();
  expect(mock.writes).toHaveLength(0);
});

it("a concurrent reconciliation prevents a late execution from overwriting its receipt or sending SMS", async () => {
  mock.create.mockImplementation(async () => {
    mock.writeConflict = true;
    return { id: "event", status: "confirmed" };
  });
  await expect(executeBooking(booking(), "actor")).rejects.toThrow("reconcile");
  expect(mock.sms).not.toHaveBeenCalled();
});

it.each(["not found", "cancelled"])(
  "a %s calendar lookup keeps the reservation uncertain with an operator action",
  async (status) => {
    receiptRow({
      status: "uncertain",
      calendarStatus: "not confirmed",
      smsStatus: "not attempted",
    });
    mock.calendarReceipt.mockResolvedValue({ id: "event", status });
    expect(
      await refreshBookingReceipt("program", "customer", booking().key),
    ).toMatchObject({
      status: "uncertain",
      operatorAction: expect.stringContaining("slot remains held"),
    });
    expect(mock.sms).not.toHaveBeenCalled();
  },
);

it("recovered calendar confirmation explicitly requires an operator to coordinate an unsent SMS", async () => {
  receiptRow({
    status: "uncertain",
    calendarStatus: "not confirmed",
    smsStatus: "not attempted",
  });
  mock.calendarReceipt.mockResolvedValue({ id: "event", status: "confirmed" });
  expect(
    await refreshBookingReceipt("program", "customer", booking().key),
  ).toMatchObject({
    status: "confirmed",
    smsStatus: "not attempted",
    operatorAction: expect.stringContaining(
      "no SMS confirmation was attempted",
    ),
  });
  expect(mock.sms).not.toHaveBeenCalled();
});

it("a changed operating brief blocks booking before reserving or querying a provider", async () => {
  vi.stubEnv("FRONTDESK_APPROVED_BRIEF_HASH", "outdated");
  await expect(executeBooking(booking(), "actor")).rejects.toThrow("owner");
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.availability).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
});
