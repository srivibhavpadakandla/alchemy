import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { seed, hash } from "../../src/lib/domain";
import { applyCommand } from "../../src/lib/commands";
import { blankBrief } from "../../src/components/video-inspired/brief";

function fictionalTextPdf(text: string) {
  const stream = text ? `BT /F1 12 Tf 40 740 Td (${text}) Tj ET` : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test("real PDF endpoint extracts fictional text and rejects a document without text", async ({
  request,
}) => {
  const text =
    "Fictional Acme Plumbing. Business hours Monday to Friday 9am to 5pm.";
  const post = (value: string) =>
    request.post("/api/frontdesk/document", {
      headers: { Origin: "http://localhost:3210" },
      multipart: {
        mode: "demo",
        programId: "demo",
        file: {
          name: "fictional-training.pdf",
          mimeType: "application/pdf",
          buffer: fictionalTextPdf(value),
        },
      },
    });
  const response = await post(text);
  test.skip(
    response.status() === 403,
    "Loopback document parser is intentionally disabled without LOCAL_CODEX_ENABLED.",
  );
  expect(response.status()).toBe(200);
  const parsed = await response.json();
  expect(parsed).toMatchObject({
    parser: "pdf-parse",
    pages: 1,
    status: "extracted",
  });
  expect(parsed.text).toContain(text);
  const empty = await post("");
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toContain("No usable PDF text found");
});

test("frontdesk setup saves a versioned operating brief without fictional external booking success", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/demo/frontdesk");
  await expect(
    page.getByRole("heading", {
      name: "What kind of business are we helping?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Plumbing", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Reviewed business context")
    .fill("Fictional example: service notes for a customer trial kickoff.");
  await page.getByRole("button", { name: "Keep this context" }).click();
  await page
    .getByRole("button", { name: "Enter and verify details manually" })
    .click();
  await page
    .getByLabel("Business hours", { exact: true })
    .fill("Monday–Friday, 09:00–17:00");
  await page.getByLabel("Business time zone").fill("America/Los_Angeles");
  await page
    .getByRole("checkbox", { name: "I am the owner or authorized editor" })
    .check();
  await page.getByRole("button", { name: "Save operating brief" }).click();
  await expect(
    page.getByRole("button", { name: /Operating brief saved/ }),
  ).toBeVisible();
  await expect(
    page.getByText("External bookings are disabled", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and book" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Operating brief saved/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit and verify the knowledge base" })
    .click();
  await expect(page.getByLabel("Business hours", { exact: true })).toHaveValue(
    "Monday–Friday, 09:00–17:00",
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(report.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    fs.mkdirSync("media/screenshots", { recursive: true });
    await page.screenshot({
      path: `media/screenshots/frontdesk-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("frontdesk provider writes and source extraction reject unauthenticated or cross-origin callers", async ({
  request,
}) => {
  const body = {
    mode: "live",
    programId: "default",
    partnerId: "kite",
    sourceIds: ["invented"],
  };
  const response = await request.post("/api/frontdesk/analyze", {
    data: body,
    headers: { Origin: "https://attacker.invalid" },
  });
  expect(response.status()).toBe(403);
  const website = await request.post("/api/frontdesk", {
    data: { mode: "demo", programId: "demo", url: "https://127.0.0.1" },
    headers: { Origin: "http://localhost:3210" },
  });
  expect(website.ok()).toBe(false);
  expect([400, 403]).toContain(website.status());
});

test("owner review keeps the extracted business purpose and requires explicit duration correction", async ({
  page,
}) => {
  // A saved draft fixture exercises owner-review behavior; it is not model-extraction proof.
  let state = seed();
  const partnerId = state.partners[0].id,
    at = new Date().toISOString();
  const intake =
    "Fictional plumbing business: book a Plumbing consultation. Meetings take 30 minutes for new customer consultations.";
  const source = (id: string, title: string, content: string) => ({
    id,
    partnerId,
    title,
    content,
    kind: "fixture" as const,
    version: 1,
    author: "Regression fixture",
    occurredAt: at.slice(0, 10),
    recordedAt: at,
    hash: hash(content),
    scope: "program members" as const,
    quoteStart: 0,
    quoteEnd: content.length,
  });
  state = applyCommand(state, {
    type: "source.add",
    source: source("test-frontdesk-intake", "Test Frontdesk intake", intake),
    key: "test-intake",
    expectedVersion: state.version,
  });
  const draft = {
    ...blankBrief,
    trade: "Plumbing",
    intakeSourceIds: ["test-frontdesk-intake"],
    facts: [
      {
        field: "bookingPurpose",
        value: "Plumbing consultation",
        originalValue: "Plumbing consultation",
        sourceId: "test-frontdesk-intake",
        quote: "Plumbing consultation",
        status: "draft",
      },
      {
        field: "appointmentMinutes",
        value: "30 minutes for new customer consultations",
        originalValue: "30 minutes for new customer consultations",
        sourceId: "test-frontdesk-intake",
        quote: "30 minutes for new customer consultations",
        status: "draft",
      },
    ],
  };
  state = applyCommand(state, {
    type: "source.add",
    source: source(
      "test-frontdesk-draft",
      "Frontdesk draft knowledge",
      JSON.stringify(draft),
    ),
    key: "test-draft",
    expectedVersion: state.version,
  });
  await page.goto("/demo/frontdesk");
  await expect(page.locator(".app-footer")).toBeVisible();
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("launchguild-fictional-v1", 1);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction("programs", "readwrite");
        tx.objectStore("programs").put(value, "demo");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, state);
  await page.reload();
  const purpose = page.locator(".fd-knowledge article").filter({
    has: page.getByLabel("Fact value: bookingPurpose", { exact: true }),
  });
  const duration = page.locator(".fd-knowledge article").filter({
    has: page.getByLabel("Fact value: appointmentMinutes", { exact: true }),
  });
  await purpose.getByRole("checkbox").check();
  await expect(
    page.getByLabel("What should callers book?", { exact: true }),
  ).toHaveCount(0);
  await duration.getByRole("checkbox").click();
  await expect(duration.getByRole("checkbox")).not.toBeChecked();
  await expect(page.locator(".fd-message[role=alert]")).toContainText(
    "whole number from 15 to 120",
  );
  await expect(
    page.getByLabel("Meeting length (minutes)", { exact: true }),
  ).toBeVisible();
  await duration
    .getByLabel("Fact value: appointmentMinutes", { exact: true })
    .fill("45");
  await duration.getByRole("checkbox").check();
  await expect(
    page.getByLabel("Meeting length (minutes)", { exact: true }),
  ).toHaveCount(0);
  await duration.getByText("Source citation", { exact: true }).click();
  await expect(duration).toContainText(
    "Owner correction · extracted value was",
  );
  await expect(duration.locator("blockquote")).toHaveText(
    "30 minutes for new customer consultations",
  );
  await page
    .getByLabel("Business hours", { exact: true })
    .fill("Monday–Friday, 09:00–17:00");
  await page.getByLabel("Business time zone").fill("America/Los_Angeles");
  await page
    .getByRole("checkbox", { name: "I am the owner or authorized editor" })
    .check();
  await page.locator(".fd-question form").evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "bookingPurpose";
    input.value = "Unreviewed override";
    input.id = "test-unreviewed-override";
    form.appendChild(input);
  });
  await page.getByRole("button", { name: "Save operating brief" }).click();
  await expect(page.locator(".fd-message[role=alert]")).toContainText(
    "differs from its verified fact",
  );
  await page
    .locator("#test-unreviewed-override")
    .evaluate((input) => input.remove());
  await page.getByRole("button", { name: "Save operating brief" }).click();
  await expect(
    page.getByRole("button", { name: /Operating brief saved/ }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Edit and verify the knowledge base" })
    .click();
  await expect(
    page.getByLabel("Fact value: bookingPurpose", { exact: true }),
  ).toHaveValue("Plumbing consultation");
  await expect(
    page.getByLabel("Fact value: appointmentMinutes", { exact: true }),
  ).toHaveValue("45");
  await duration.getByText("Source citation", { exact: true }).click();
  await expect(duration).toContainText(
    "Owner correction · extracted value was",
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(report.violations).toEqual([]);
    await page.screenshot({
      path: `media/screenshots/frontdesk-knowledge-${width}.png`,
      fullPage: true,
    });
  }
});

test("latest brief and draft follow recorded time rather than provider row order", async ({
  page,
}) => {
  // SQL may return equal-version source rows by UUID. These records deliberately arrive out of time order.
  let state = seed();
  const first = state.partners[0].id,
    second = state.partners[1].id;
  const brief = (purpose: string) => ({
    ...blankBrief,
    trade: "Plumbing",
    businessHours: "Monday–Friday 09:00–17:00",
    timeZone: "America/Los_Angeles",
    bookingPurpose: purpose,
  });
  const records = [
    [
      first,
      "Frontdesk operating brief",
      "2026-01-01T10:00:00.000Z",
      brief("Old saved purpose"),
    ],
    [
      first,
      "Frontdesk draft knowledge",
      "2026-01-04T10:00:00.000Z",
      brief("Newest draft purpose"),
    ],
    [
      first,
      "Frontdesk draft knowledge",
      "2026-01-02T10:00:00.000Z",
      brief("Old draft purpose"),
    ],
    [
      second,
      "Frontdesk operating brief",
      "2026-01-04T10:00:00.000Z",
      brief("Newest saved purpose"),
    ],
    [
      second,
      "Frontdesk operating brief",
      "2026-01-01T10:00:00.000Z",
      brief("Old saved purpose"),
    ],
  ] as const;
  for (const [
    index,
    [partnerId, title, recordedAt, value],
  ] of records.entries()) {
    const content = JSON.stringify(value);
    state = applyCommand(state, {
      type: "source.add",
      expectedVersion: state.version,
      key: `ordering-${index}`,
      source: {
        id: `ordering-${index}`,
        partnerId,
        title,
        content,
        kind: "fixture",
        version: 1,
        author: "Regression fixture",
        occurredAt: recordedAt.slice(0, 10),
        recordedAt,
        hash: hash(content),
        scope: "program members",
        quoteStart: 0,
        quoteEnd: content.length,
      },
    });
  }
  await page.goto("/demo/frontdesk");
  await expect(page.locator(".app-footer")).toBeVisible();
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("launchguild-fictional-v1", 1);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction("programs", "readwrite");
        tx.objectStore("programs").put(value, "demo");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, state);
  await page.reload();
  await expect(
    page.getByLabel("What should callers book?", { exact: true }),
  ).toHaveValue("Newest draft purpose");
  await page.locator(".fd-progress select").selectOption(second);
  await page
    .getByRole("button", { name: "Edit and verify the knowledge base" })
    .click();
  await expect(
    page.getByLabel("What should callers book?", { exact: true }),
  ).toHaveValue("Newest saved purpose");
  await page.locator(".fd-progress select").selectOption(first);
  await expect(
    page.getByLabel("What should callers book?", { exact: true }),
  ).toHaveValue("Newest draft purpose");
});

test("training intake locks the picker and discards a delayed result after customer scope changes", async ({
  page,
}) => {
  // Delay a parser fixture to reproduce the UI race; this does not verify PDF extraction.
  let release!: () => void, started!: () => void;
  const pending = new Promise<void>((resolve) => {
      release = resolve;
    }),
    parsing = new Promise<void>((resolve) => {
      started = resolve;
    });
  await page.route("**/api/frontdesk/document", async (route) => {
    started();
    await pending;
    await route.fulfill({
      json: {
        name: "scope-test.pdf",
        text: "Fictional training text for the original customer only.",
        pages: 1,
        status: "extracted",
      },
    });
  });
  await page.goto("/demo/frontdesk");
  await page.getByRole("button", { name: "Plumbing", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip website for now" }).click();
  const picker = page.locator(".fd-progress select");
  const options = await picker
    .locator("option")
    .evaluateAll((items) =>
      items.map((item) => (item as HTMLOptionElement).value),
    );
  await page.locator(".fd-upload input").setInputFiles({
    name: "scope-test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nregression fixture"),
  });
  await parsing;
  await expect(picker).toBeDisabled();
  // Force a navigation-like scope change while the request is pending to test stale-result admission.
  await picker.evaluate((element, value) => {
    (element as HTMLSelectElement).disabled = false;
    (element as HTMLSelectElement).value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, options[1]);
  await expect(
    page.getByRole("heading", {
      name: "What kind of business are we helping?",
    }),
  ).toBeVisible();
  release();
  await page.getByRole("button", { name: "Plumbing", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip website for now" }).click();
  await expect(page.getByText("scope-test.pdf", { exact: true })).toHaveCount(
    0,
  );
});

test("demo email automation remains blocked and its API rejects unauthorized requests", async ({
  page,
  request,
}) => {
  await page.goto("/demo/tasks/northstar");
  const panel = page.locator(".email-automation");
  await expect(
    panel.getByRole("heading", { name: "Customer email automation" }),
  ).toBeVisible();
  await expect(panel).toContainText(
    "Setup blocked: use a hosted authenticated workspace",
  );
  await expect(
    panel.getByRole("button", { name: "Enable automation" }),
  ).toBeDisabled();
  await expect(panel).toContainText("No email submissions recorded");
  const data = {
    action: "pause",
    programId: "default",
    partnerId: "northstar",
  };
  const crossOrigin = await request.post("/api/email-automation", {
    data,
    headers: { Origin: "https://attacker.invalid" },
  });
  expect(crossOrigin.status()).toBe(403);
  const unsigned = await request.post("/api/email-automation", {
    data,
    headers: { Origin: "http://localhost:3210" },
  });
  expect(unsigned.ok()).toBe(false);
  expect([400, 401, 403]).toContain(unsigned.status());
});
