import { test, expect } from "@playwright/test";
test("founder compares, commits, refreshes and sees one decision without a sale", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo/capacity");
  await expect(
    page.getByRole("heading", { name: "Choose what you build next." }),
  ).toBeVisible();
  await expect(page.locator(".opportunity-total")).toContainText("$38,000");
  await page
    .locator(".work-card")
    .filter({ hasText: "Bulk CSV import" })
    .getByRole("button", { name: "Add to plan" })
    .click();
  await expect(page.locator(".opportunity-total")).toContainText("$38,000");
  await expect(page.getByText("$0 additional deal value")).toBeVisible();
  await page
    .locator(".work-card")
    .filter({ hasText: "Bulk CSV import" })
    .getByRole("button", { name: "Selected", exact: true })
    .click();
  await page
    .locator(".work-card")
    .filter({ hasText: "Custom approval workflow" })
    .getByRole("button", { name: "Add to plan" })
    .click();
  await expect(page.getByText("Overbooked by")).toContainText("16");
  await page
    .locator(".work-card")
    .filter({ hasText: "Custom approval workflow" })
    .getByRole("button", { name: "Selected", exact: true })
    .click();
  await page.getByRole("button", { name: "Review plan", exact: true }).click();
  await page
    .getByLabel("Why is this the right tradeoff?")
    .fill(
      "Shared integration serves our target segment; founder owns the next buyer discussions.",
    );
  await page.getByRole("button", { name: "Commit reviewed plan" }).click();
  await expect(page.getByRole("status")).toContainText("Work queued");
  await page.goto("/demo/decisions");
  await expect(page.locator(".decision-history")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".decision-history")).toHaveCount(1);
  await page.goto("/demo");
  await expect(page.locator(".hud")).toContainText("PAYMENT RECEIPTS");
  await expect(page.locator(".hud > div").last()).toContainText("0");
  await expect(
    page.locator(".partner-card").filter({ hasText: "Northstar Logistics" }),
  ).toContainText("active pilot");
  expect(errors).toEqual([]);
});
test("source drawer, real setup errors, manual editing and export", async ({
  page,
}) => {
  await page.goto("/demo/partners/kite");
  await page.getByRole("tab", { name: "Requests & promises" }).click();
  await expect(page.getByText("A request is not a promise")).toBeVisible();
  await page.getByRole("button", { name: "Open exact source" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "one-off approval workflow",
  );
  await page.getByRole("button", { name: "Review with Gemma" }).click();
  await expect(page.getByRole("status")).toContainText("setup required");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Edit partner" }).click();
  await page
    .getByLabel("Specific problem")
    .fill("Manual edited requirement survives refresh.");
  await page.getByRole("button", { name: "Save partner record" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Manual edited requirement survives refresh."),
  ).toBeVisible();
  await page.goto("/demo/settings");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export program", exact: true })
    .click();
  const file = await dl;
  expect(file.suggestedFilename()).toMatch(/launchguild-demo/);
  await file.saveAs("media/demo-export.json");
});
test("authentication and cross-origin APIs fail closed", async ({
  request,
}) => {
  const denied = await request.get("/api/programs/foreign");
  expect(denied.ok()).toBeFalsy();
  const patch = await request.patch("/api/programs/foreign", {
    headers: { origin: "https://evil.example" },
    data: {},
  });
  expect(patch.status()).toBe(403);
  const voice = await request.post("/api/voice", {
    headers: { origin: "http://localhost:3210" },
    data: { programId: "demo", mode: "demo" },
  });
  expect(voice.status()).toBe(503);
});
for (const width of [1440, 1280, 768, 390])
  test(`visual surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
    for (const [path, name] of [
      ["/", "landing"],
      ["/login", "login"],
      ["/demo", "town"],
      ["/demo/agents", "agents"],
      ["/demo/partners/kite", "partner"],
      ["/demo/capacity", "capacity"],
      ["/demo/evidence", "evidence"],
      ["/demo/settings", "settings"],
    ]) {
      await page.goto(path);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (path.startsWith("/demo"))
        await expect(page.locator(".app-footer")).toBeAttached();
      await page.screenshot({
        path: `media/screenshots/${name}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} overflow at ${width}`,
      ).toBe(true);
    }
  });
test("voice opens safely, text tools retrieve sources, unavailable provider leaves microphone off", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await page.getByRole("button", { name: "Ask Alchemy" }).click();
  await expect(page.getByRole("dialog")).toContainText("Microphone off");
  await page
    .getByRole("button", { name: "What blocks Juniper becoming paid?" })
    .click();
  await expect(page.locator(".tool-answer")).toContainText(
    "Economic buyer involved: unknown",
  );
  await page.getByRole("button", { name: "Start voice session" }).click();
  await expect(page.getByRole("status")).toContainText("setup required");
  await expect(page.getByRole("dialog")).toContainText("Microphone off");
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(errors).toEqual([]);
});
test("Northstar product evidence does not clear commercial blockers; fixture upgrade requires receipt", async ({
  page,
}) => {
  await page.goto("/demo/partners/northstar");
  await page.getByRole("tab", { name: "Readiness" }).click();
  await expect(page.locator(".readiness-banner")).toContainText("6");
  await expect(page.locator(".readiness-banner")).toContainText("2 blocked");
  await page.getByRole("tab", { name: "People & pilot" }).click();
  await expect(page.getByText("98/100", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review and record outcome" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.locator(".partner-heading")).toContainText(
    "outcome achieved",
  );
  await expect(
    page.getByText("No payment evidence.", { exact: false }),
  ).toBeVisible();
});
test("keyboard dialog escape restores focus, reduced motion and form failure preserve records", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo/partners/kite");
  const edit = page.getByRole("button", { name: "Edit partner" });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await edit.click();
  await page.getByLabel("Stage", { exact: true }).selectOption("customer");
  await page.getByRole("button", { name: "Save partner record" }).click();
  await expect(page.getByRole("status")).toContainText("receipt");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.locator(".partner-heading")).toContainText("active pilot");
});
test("reviewed request relink persists and changes deduplicated attribution", async ({
  page,
}) => {
  await page.goto("/demo/requests");
  const card = page.locator(".work-grid>.panel").filter({
    has: page.getByRole("heading", {
      name: "Shared Salesforce integration",
      exact: true,
    }),
  });
  const review = card.locator("details").first();
  await review.locator("summary").click();
  await review.getByLabel("Shared work item").selectOption("custom_approval");
  await review
    .getByLabel("Reason for this link")
    .fill("Founder confirmed the requirement belongs to this scope.");
  await review.getByRole("button", { name: "Confirm request link" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(card.locator(".request-link")).toHaveCount(1);
  await page.goto("/demo/capacity");
  await expect(page.locator(".opportunity-total")).toContainText("$8,000");
});
test("customer agreement remains distinct from a paid receipt", async ({
  page,
}) => {
  await page.goto("/demo/partners/kite");
  await page
    .getByRole("button", { name: "Record agreement / payment evidence" })
    .click();
  await page.getByLabel("Record type").selectOption("customer");
  await page
    .getByRole("button", { name: "Record reviewed commercial evidence" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      "No payment evidence. Buyer, terms and security require separate confirmation.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Documented customer agreement" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Documented customer agreement" }),
  ).toBeVisible();
});
