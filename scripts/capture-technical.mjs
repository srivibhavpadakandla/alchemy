import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: "media/raw/technical",
    size: { width: 1440, height: 900 },
  },
});
const page = await context.newPage();
const writer = await context.newPage();
const base = "http://localhost:3210";
await page.goto(base + "/demo/requests");
await page
  .locator(".work-grid>.panel")
  .filter({
    has: page.getByRole("heading", {
      name: "Shared Salesforce integration",
      exact: true,
    }),
  })
  .getByRole("button", { name: "Challenge recommendation" })
  .click();
await page
  .getByLabel("Proposed classification")
  .selectOption("reusable configuration");
await page
  .getByLabel("Evidence and reasoning")
  .fill(
    "Proposed correction pinned to the original integration classification.",
  );
await page
  .getByRole("button", { name: "Create correction for review" })
  .click();
await page
  .getByRole("heading", { name: "Protected corrections" })
  .scrollIntoViewIfNeeded();
await page.waitForTimeout(4000);
await writer.goto(base + "/demo/partners/kite");
await writer.getByRole("button", { name: "Edit partner" }).click();
await writer
  .getByLabel("Specific problem")
  .fill(
    "UNRELATED NOTE: preserve these exact bytes after the classification conflict.",
  );
await writer.getByRole("button", { name: "Save partner record" }).click();
await writer.getByRole("dialog").waitFor({ state: "detached" });
await writer.goto(base + "/demo/requests");
await writer
  .locator(".work-grid>.panel")
  .filter({
    has: writer.getByRole("heading", {
      name: "Shared Salesforce integration",
      exact: true,
    }),
  })
  .getByRole("button", { name: "Review class & estimate" })
  .click();
await writer.getByLabel("Primary class").selectOption("core product");
await writer
  .getByRole("button", { name: "Approve reviewed work version" })
  .click();
await writer.getByRole("dialog").waitFor({ state: "detached" });
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Accept scoped correction" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Same-field conflict" })
  .waitFor();
await page.screenshot({ path: "media/raw/technical-conflict.png" });
await page.waitForTimeout(7000);
await page.goto(base + "/demo/partners/kite");
await page
  .getByText(
    "UNRELATED NOTE: preserve these exact bytes after the classification conflict.",
    { exact: true },
  )
  .waitFor();
await page.screenshot({ path: "media/raw/technical-preserved.png" });
await page.waitForTimeout(6000);
await context.close();
fs.copyFileSync(
  await page.video().path(),
  "media/raw/concurrent-edit-proof.webm",
);
await browser.close();
console.log("Two-tab edit conflict rejected; unrelated bytes preserved.");
