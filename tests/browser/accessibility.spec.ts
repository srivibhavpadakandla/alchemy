import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
test("critical accessibility checks", async ({ page }) => {
  const reports = [];
  for (const route of [
    "/",
    "/login",
    "/demo",
    "/demo/agents",
    "/demo/capacity",
    "/demo/partners/kite",
  ]) {
    await page.goto(route);
    if (route.startsWith("/demo"))
      await expect(page.locator(".app-footer")).toBeAttached();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({ route, violations: results.violations });
  }
  fs.writeFileSync(
    "media/accessibility.json",
    JSON.stringify(reports, null, 2),
  );
  expect(reports.flatMap((r) => r.violations)).toEqual([]);
});
