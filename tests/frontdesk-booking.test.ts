import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  BookingSchema,
  calendarAvailability,
  createCalendarBooking,
  sendBookingSms,
  validateWindow,
  validateBusinessHours,
  fetchBookingSms,
  fetchCalendarBooking,
  calendarEventId,
  validateApprovedBookingPolicy,
} from "../src/lib/frontdesk-booking";
import { hash } from "../src/lib/domain";
import { blankBrief } from "../src/components/video-inspired/brief";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T00:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const start = "2027-01-04T10:00:00Z",
  end = "2027-01-04T10:30:00Z";
function configure() {
  for (const k of [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_REFRESH_TOKEN",
    "GOOGLE_CALENDAR_ID",
    "FRONTDESK_PROGRAM_ID",
  ])
    vi.stubEnv(k, "test-only");
  vi.stubEnv("FRONTDESK_TIME_ZONE", "UTC");
  vi.stubEnv("FRONTDESK_OPEN_HOUR", "9");
  vi.stubEnv("FRONTDESK_CLOSE_HOUR", "17");
  vi.stubEnv("FRONTDESK_WEEKDAYS", "1,2,3,4,5");
}
const input = () =>
  BookingSchema.parse({
    programId: "test-only",
    partnerId: "p",
    start,
    end,
    name: "Example",
    email: "example@example.com",
    key: "6c22b88b-2a43-4868-a6bb-f1a5f83a2426",
    confirmed: true,
    timeZone: "UTC",
    smsConsent: false,
  });
it("requires explicit booking confirmation and rejects malformed contact data", () => {
  expect(() => BookingSchema.parse({ ...input(), confirmed: false })).toThrow();
  expect(() => BookingSchema.parse({ ...input(), phone: "123" })).toThrow();
});
it("rejects past, too long and invalid windows", () => {
  const now = Date.parse("2026-10-03T00:00:00Z");
  expect(() => validateWindow("2026-01-01", end, now)).toThrow();
  expect(() => validateWindow(start, "2027-01-04T15:00:00Z", now)).toThrow();
  expect(() => validateWindow(start, end, now)).not.toThrow();
});
it("enforces configured local operating days and hours", () => {
  configure();
  expect(() => validateBusinessHours(start, end)).not.toThrow();
  expect(() =>
    validateBusinessHours("2027-01-03T10:00:00Z", "2027-01-03T10:30:00Z"),
  ).toThrow("outside");
  expect(() =>
    validateBusinessHours("2027-01-04T18:00:00Z", "2027-01-04T18:30:00Z"),
  ).toThrow("outside");
  vi.stubEnv("FRONTDESK_TIME_ZONE", "");
  expect(() => validateBusinessHours(start, end)).toThrow("Confirm");
});
it("missing calendar credentials produce no synthetic availability", async () => {
  configure();
  vi.stubEnv("GOOGLE_CALENDAR_REFRESH_TOKEN", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(calendarAvailability(start, end)).rejects.toThrow("setup");
  expect(fetcher).not.toHaveBeenCalled();
});
it("calendar provider errors are not interpreted as a free appointment", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(
        Response.json({
          calendars: { "test-only": { errors: [{ reason: "notFound" }] } },
        }),
      ),
  );
  await expect(calendarAvailability(start, end)).rejects.toThrow("verified");
});
it("calendar availability requires a real provider-shaped receipt", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(
        Response.json({
          calendars: { "test-only": { busy: [{ start, end }] } },
        }),
      ),
  );
  expect((await calendarAvailability(start, end)).available).toBe(false);
});
it("a duplicate calendar ID with different evidence is rejected", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(new Response("", { status: 409 }))
      .mockResolvedValueOnce(
        Response.json({
          extendedProperties: { private: { alchemyKey: "someone-else" } },
        }),
      ),
  );
  await expect(createCalendarBooking(input())).rejects.toThrow("differs");
});
it("SMS requires consent and keeps queued separate from delivered", async () => {
  for (const k of [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
  ])
    vi.stubEnv(k, "test-only");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ sid: "SM" + "a".repeat(32), status: "queued" }),
    );
  vi.stubGlobal("fetch", fetcher);
  await expect(sendBookingSms(input())).rejects.toThrow("consent");
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await sendBookingSms({
        ...input(),
        phone: "+15555550123",
        smsConsent: true,
      })
    ).status,
  ).toBe("queued");
});

it("rejects invalid configured zones, days and appointments extending seconds beyond closing", () => {
  configure();
  expect(() =>
    validateBusinessHours("2027-01-04T16:30:00Z", "2027-01-04T17:00:01Z"),
  ).toThrow("outside");
  vi.stubEnv("FRONTDESK_TIME_ZONE", "Not/AZone");
  expect(() => validateBusinessHours(start, end)).toThrow("server-side");
  vi.stubEnv("FRONTDESK_TIME_ZONE", "UTC");
  vi.stubEnv("FRONTDESK_WEEKDAYS", "1,9");
  expect(() => validateBusinessHours(start, end)).toThrow("Confirm");
});

it("treats malformed busy intervals as unverifiable rather than free", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(
        Response.json({
          calendars: { "test-only": { busy: [{ start: "bad", end }] } },
        }),
      ),
  );
  await expect(calendarAvailability(start, end)).rejects.toThrow("verified");
});

it("allows adjacent appointments because the provider intervals have exclusive end times", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(
        Response.json({
          calendars: {
            "test-only": {
              busy: [{ start: "2027-01-04T09:00:00Z", end: start }],
            },
          },
        }),
      ),
  );
  expect((await calendarAvailability(start, end)).available).toBe(true);
});

it("checks actual calendar event shape before claiming confirmation", async () => {
  configure();
  const b = input(),
    id = calendarEventId(b.programId, b.key);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
      .mockResolvedValueOnce(Response.json({ id, status: "confirmed" })),
  );
  await expect(createCalendarBooking(b)).rejects.toThrow("unverified");
});

it("reconciles an uncertain calendar request using GET without creating another event", async () => {
  configure();
  const b = input(),
    id = calendarEventId(b.programId, b.key);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: "mock-token" }))
    .mockResolvedValueOnce(
      Response.json({
        id,
        status: "confirmed",
        start: { dateTime: start },
        end: { dateTime: end },
        extendedProperties: {
          private: {
            alchemyKey: b.key,
            alchemyProgram: b.programId,
            alchemyPartner: b.partnerId,
          },
        },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(await fetchCalendarBooking(b)).toEqual({ id, status: "confirmed" });
  expect(fetcher.mock.calls[1][0]).toContain(`/events/${id}`);
  expect(fetcher.mock.calls[1][1].method).toBeUndefined();
});

it("only reports SMS delivery from a matching provider receipt and never resends during refresh", async () => {
  vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test-only");
  vi.stubEnv("TWILIO_FROM_NUMBER", "+15555550123");
  const id = "SM" + "a".repeat(32);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        sid: id,
        account_sid: "ACtest",
        status: "delivered",
        error_code: null,
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ sid: id, account_sid: "other", status: "delivered" }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect((await fetchBookingSms(id)).status).toBe("delivered");
  expect(fetcher.mock.calls[0][0]).toContain(`/Messages/${id}.json`);
  expect(fetcher.mock.calls[0][1].method).toBeUndefined();
  await expect(fetchBookingSms(id)).rejects.toThrow("verified");
});

it("pins booking policy to the reviewed brief and rejects changed duration, zone or unreviewed hours", () => {
  configure();
  const content = JSON.stringify({
    ...blankBrief,
    trade: "Services",
    timeZone: "UTC",
    businessHours: "Monday-Friday 9am-5pm",
  });
  const source = { content, hash: hash(content) };
  expect(() =>
    validateApprovedBookingPolicy(source, start, end, "UTC"),
  ).toThrow("owner");
  vi.stubEnv("FRONTDESK_APPROVED_BRIEF_HASH", source.hash);
  expect(validateApprovedBookingPolicy(source, start, end, "Etc/UTC")).toBe(
    source.hash,
  );
  expect(() =>
    validateApprovedBookingPolicy(source, start, "2027-01-04T10:15:00Z", "UTC"),
  ).toThrow("30-minute");
  expect(() =>
    validateApprovedBookingPolicy(source, start, end, "America/Los_Angeles"),
  ).toThrow("time zone");
  const changed = JSON.stringify({
    ...JSON.parse(content),
    businessHours: "Tuesday only",
  });
  expect(() =>
    validateApprovedBookingPolicy(
      { content: changed, hash: hash(changed) },
      start,
      end,
    ),
  ).toThrow("owner");
});
