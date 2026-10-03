import { chromium } from "@playwright/test";
import fs from "node:fs";
const composition = JSON.parse(
  fs.readFileSync("media/composition.json", "utf8"),
);
fs.mkdirSync("media/raw", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: "media/raw", size: { width: 1440, height: 810 } },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const base = "http://localhost:3210";
const click = async (name) =>
  page.getByRole("button", { name, exact: true }).click();
const card = (name) => page.locator(".work-card").filter({ hasText: name });
const actions = {
  town: async () => {
    await page.goto(base + "/demo");
    await page.locator(".app-footer").waitFor();
  },
  kite: async () => {
    await page.goto(base + "/demo/partners/kite");
    await page.getByRole("tab", { name: "Requests & promises" }).click();
  },
  evidence: async () => {
    await page.goto(base + "/demo/evidence");
    await page
      .getByText("Scope conversation · fictional", { exact: true })
      .scrollIntoViewIfNeeded();
  },
  custom: async () => {
    await page.goto(base + "/demo/capacity");
    await card("Shared Salesforce integration")
      .getByRole("button", { name: "Selected", exact: true })
      .click();
    await card("Custom approval workflow")
      .getByRole("button", { name: "Add to plan" })
      .click();
    await page.locator(".plan-summary").scrollIntoViewIfNeeded();
  },
  shared: async () => {
    await card("Custom approval workflow")
      .getByRole("button", { name: "Selected", exact: true })
      .click();
    await card("Shared Salesforce integration")
      .getByRole("button", { name: "Add to plan" })
      .click();
    await card("Bulk CSV import")
      .getByRole("button", { name: "Add to plan" })
      .click();
    await page.locator(".opportunity-total").scrollIntoViewIfNeeded();
  },
  readiness: async () => {
    await page.goto(base + "/demo/partners/juniper");
    await page.getByRole("tab", { name: "Readiness" }).click();
    await page.getByRole("button", { name: "Ask the guild" }).click();
    await page
      .getByRole("button", { name: "What blocks Juniper becoming paid?" })
      .click();
  },
  commit: async () => {
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.goto(base + "/demo/capacity");
    await click("Review plan");
    await page
      .getByLabel("Why is this the right tradeoff?")
      .fill(
        "Shared integration serves our current segment. Founder owns buyer introductions; engineering owns the scoped Salesforce build. Commercial gates remain unconfirmed.",
      );
    await page.waitForTimeout(4000);
    await page.getByRole("button", { name: "Commit reviewed plan" }).click();
    await page.waitForTimeout(2000);
    await page.goto(base + "/demo/decisions");
  },
  decision: async () => {
    await page.reload();
    await page.locator(".decision-history").waitFor();
  },
};
const timings = [];
for (const scene of composition.scenes) {
  const start = Date.now();
  await actions[scene.id]();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `media/raw/${scene.id}.png` });
  const remaining = scene.seconds * 1000 - (Date.now() - start);
  if (remaining > 0) await page.waitForTimeout(remaining);
  timings.push({ id: scene.id, actualMilliseconds: Date.now() - start });
  console.log(`Captured ${scene.id}`);
}
await context.close();
const video = await page.video().path();
fs.copyFileSync(video, "media/raw/founder-journey.webm");
fs.writeFileSync("media/raw/timings.json", JSON.stringify(timings, null, 2));
await browser.close();
