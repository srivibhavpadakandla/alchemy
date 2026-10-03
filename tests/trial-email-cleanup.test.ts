import { beforeEach, expect, it, vi } from "vitest";
import { emailRetryEligible } from "../src/lib/trial-email";
const mocked = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  fail: false,
}));
vi.mock("../src/lib/supabase/admin", () => ({
  adminClient: () => ({
    from: () => {
      let change: Record<string, unknown> | null = null,
        cap = Infinity,
        sort = "";
      const filters: ((r: Record<string, unknown>) => boolean)[] = [];
      const query = {
        select: () => query,
        update: (value: Record<string, unknown>) => {
          change = value;
          return query;
        },
        eq: (k: string, v: unknown) => {
          filters.push((r) => r[k] === v);
          return query;
        },
        in: (k: string, values: unknown[]) => {
          filters.push((r) => values.includes(r[k]));
          return query;
        },
        order: (k: string) => {
          sort = k;
          return query;
        },
        limit: (n: number) => {
          cap = n;
          return query;
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (mocked.fail)
            return Promise.resolve(
              resolve({ error: new Error("database unavailable"), data: null }),
            );
          let rows = mocked.rows.filter((r) => filters.every((f) => f(r)));
          if (sort)
            rows = rows.toSorted((a, b) =>
              String(a[sort]).localeCompare(String(b[sort])),
            );
          rows = rows.slice(0, cap);
          if (change) for (const row of rows) Object.assign(row, change);
          return Promise.resolve(resolve({ data: rows, error: null }));
        },
      };
      return query;
    },
  }),
}));
import { reconcileExpiredEmailRetries } from "../src/lib/trial-email-job";
const now = Date.parse("2026-09-09T17:00:00Z");
beforeEach(() => {
  mocked.rows = [];
  mocked.fail = false;
});
it("closes exhausted uncertainty once and advances through more than one cleanup batch to an expired pending email", async () => {
  mocked.rows = Array.from({ length: 120 }, (_, i) => ({
    key: `uncertain-${i}`,
    status: "uncertain",
    attempts: 3,
    retry_closed: false,
    created_at: "2026-09-09T13:00:00Z",
    updated_at: "2026-09-09T13:00:00Z",
  }));
  mocked.rows.push({
    key: "expired-pending",
    status: "pending",
    attempts: 1,
    retry_closed: false,
    created_at: "2026-09-09T14:00:00Z",
    updated_at: "2026-09-09T14:00:00Z",
  });
  expect(await reconcileExpiredEmailRetries(now)).toBe(100);
  expect(await reconcileExpiredEmailRetries(now)).toBe(21);
  expect(await reconcileExpiredEmailRetries(now)).toBe(0);
  expect(mocked.rows.every((r) => r.retry_closed === true)).toBe(true);
  expect(mocked.rows.at(-1)).toMatchObject({
    status: "uncertain",
    attempts: 1,
    retry_closed: true,
  });
  expect(emailRetryEligible(mocked.rows.at(-1) as never, now)).toBe(false);
});
it("keeps retry-window pending email open, but cancels an expired queue that was never submitted", async () => {
  mocked.rows = [
    {
      key: "retryable",
      status: "pending",
      attempts: 1,
      retry_closed: false,
      created_at: "2026-09-09T16:30:00Z",
      updated_at: "2026-09-09T16:58:00Z",
    },
    {
      key: "unsent",
      status: "pending",
      attempts: 0,
      retry_closed: false,
      created_at: "2026-09-09T13:00:00Z",
      updated_at: "2026-09-09T13:00:00Z",
    },
  ];
  expect(await reconcileExpiredEmailRetries(now)).toBe(1);
  expect(mocked.rows[0].retry_closed).toBe(false);
  expect(mocked.rows[1]).toMatchObject({
    status: "cancelled",
    attempts: 0,
    retry_closed: true,
  });
});
it("propagates cleanup database failures without claiming queue repair", async () => {
  mocked.fail = true;
  await expect(reconcileExpiredEmailRetries(now)).rejects.toThrow(
    "database unavailable",
  );
});
