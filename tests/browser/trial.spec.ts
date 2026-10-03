import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
test("customer notes → reviewed plan → measurement → pinned report and task → explicit decision", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await page.getByRole("button", { name: "NEW CUSTOMER" }).click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Neighborhood café");
  await page
    .getByLabel("What do they need?")
    .fill(
      "Example trial: weigh waste per cover. Baseline 100 g per cover over August 1–30.",
    );
  await page.getByRole("button", { name: "Create customer record" }).click();
  await expect(
    page.getByRole("heading", { name: "Define success before you start." }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  async function source(title: string, content: string) {
    await page
      .getByRole("button", { name: "Add evidence", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Author / participant").fill("Example café operator");
    await page.getByLabel("Exact source text").fill(content);
    await page.getByRole("button", { name: "Save source version" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await source(
    "Example review",
    "Fictional participant acknowledges exact trial plan, responsibilities, 20% target and separate paid offer.",
  );
  await source(
    "Example result",
    "Fictional manual measurement: September 1–30 waste totaled 76 grams per cover, normalized by covers served.",
  );
  await page.getByLabel("Is there a working deliverable?").selectOption("yes");
  for (const [label, value] of [
    ["Trial starts", "2026-09-01"],
    ["Trial ends", "2026-09-30"],
    [
      "Startup deliverables",
      "Install the waste tracking dashboard and review each weekly summary.",
    ],
    [
      "Customer responsibilities",
      "Record waste weight and covers served daily.",
    ],
    ["Baseline period starts", "2026-08-01"],
    ["Baseline period ends", "2026-08-30"],
    ["Metric name", "Waste per cover"],
    ["Unit", "grams per cover"],
    ["Baseline value", "100"],
    ["Success target", "20"],
    ["Exposure / normalization", "per cover served"],
    [
      "Measurement method",
      "Weigh daily waste and divide by covers served; use 30-day periods.",
    ],
    ["Paid plan and deliverables", "Waste tracking dashboard subscription"],
    ["Price (USD)", "199"],
    [
      "Conditions and decision process",
      "Separate written acceptance after results review.",
    ],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByLabel("Baseline source")
    .selectOption({ label: "Customer conversation notes · reported note" });
  await page.getByLabel("Compare").selectOption("relative change");
  await page.getByLabel("Improvement direction").selectOption("lower");
  await page.getByRole("button", { name: "Save trial plan draft" }).click();
  await expect(
    page.getByRole("button", { name: "Record plan review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record plan review" }).click();
  await page
    .getByLabel("Startup approval evidence")
    .selectOption({ label: "Example review · fixture" });
  await page
    .getByLabel("Customer acknowledgment evidence")
    .selectOption({ label: "Example review · fixture" });
  await page
    .getByRole("button", { name: "Save reviewed plan version" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Both reviews recorded", { exact: true }),
  ).toBeVisible();
  await page.goto(`/demo/tasks/${id}`);
  await expect(page.locator(".trial-task-row")).toContainText(
    "Schedule trial kickoff",
  );
  await page.goto(`/demo/metrics/${id}`);
  await page.getByLabel("Observed value").fill("76");
  await page.getByLabel("Fresh through").fill("2026-12-31");
  await page
    .getByLabel("Measurement source")
    .selectOption({ label: "Example result · fixture" });
  await page.getByRole("button", { name: "Save reported measurement" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto(`/demo/results/${id}`);
  await expect(
    page.getByRole("heading", { name: "Reported target met", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".trial-result-values")).toContainText("-24.0%");
  await expect(
    page.getByText("measurement.recorded / succeeded"),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results report" }).click();
  const file = await downloaded;
  const path = await file.path();
  const report = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(report.pinnedReport).toMatchObject({ targetMet: true, change: -24 });
  expect(
    report.sources.some((s: { title: string }) => s.title === "Example result"),
  ).toBe(true);
  expect(report.commercial).toEqual({
    acceptanceSourceId: null,
    paymentSourceId: null,
  });
  await page.reload();
  await expect(
    page.getByText("measurement.recorded / succeeded"),
  ).toBeVisible();
  await page.goto(`/demo/tasks/${id}`);
  await expect(page.locator(".trial-task-row").last()).toContainText(
    "Review results and paid offer",
  );
  await page.goto(`/demo/offer/${id}`);
  await page.getByLabel("Customer decision").selectOption("inconclusive");
  await page
    .getByLabel("Decision evidence")
    .selectOption({ label: "Example review · fixture" });
  await page
    .getByLabel("Decision and next action")
    .fill(
      "Customer wants another comparable month before a purchase decision.",
    );
  await page
    .getByRole("button", { name: "Record commercial decision" })
    .click();
  await expect(
    page.getByText("Latest: inconclusive", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("No payment receipt has been recorded."),
  ).toBeVisible();
  for (const route of ["plan", "tasks", "metrics", "results", "offer"]) {
    await page.goto(`/demo/${route}/${id}`);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations, route).toEqual([]);
    await page.screenshot({
      path: `media/screenshots/alchemy-${route}-390.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/demo/results/${id}`);
  await page.screenshot({
    path: "media/screenshots/alchemy-results-1440.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Alchemy landing remains visible with reduced motion and all CTA destinations work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Where trials turn into trust.",
    }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `media/screenshots/alchemy-landing-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("link", { name: "Follow the trial", exact: true })
    .click();
  await expect(page).toHaveURL(/#how-it-works/);
  await expect(
    page.getByRole("heading", { name: "A conversation." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open the trial workspace" }).click();
  await expect(page).toHaveURL(/\/demo\/plan$/);
  await expect(page.locator(".trial-plan-form")).toBeVisible();
});
