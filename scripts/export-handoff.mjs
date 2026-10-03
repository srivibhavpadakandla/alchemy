import fs from "node:fs";
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3210/demo/capacity");
await page.getByRole("button", { name: "Review plan", exact: true }).click();
await page
  .getByLabel("Why is this the right tradeoff?")
  .fill(
    "Fictional handoff example: shared integration serves two partners with commercial checks still open.",
  );
await page.getByRole("button", { name: "Commit reviewed plan" }).click();
await page.getByRole("status").filter({ hasText: "Work queued" }).waitFor();
await page.goto("http://localhost:3210/demo/settings");
for (const [button, file] of [
  ["Export program", "artifacts/fictional-program-with-decision.json"],
  ["Export redacted plan", "artifacts/redacted-plan.json"],
]) {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  await (await waiting).saveAs(file);
  const obj = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!obj.schema) throw Error("Invalid export");
}
await browser.close();
const program = JSON.parse(
  fs.readFileSync("artifacts/fictional-program-with-decision.json", "utf8"),
);
const decision = program.decisions[0];
fs.writeFileSync(
  "artifacts/selected-records-and-formulas.json",
  JSON.stringify(
    {
      disclosure:
        "Entirely fictional selected records; expressly exported with sources for reproducibility.",
      schema: "launchguild-selected-v1",
      decision,
      work: program.work.filter((w) => decision.selected.includes(w.id)),
      partners: program.partners.filter((p) =>
        decision.result.partnerIds.includes(p.id),
      ),
      sources: program.sources.filter((s) =>
        decision.result.partnerIds.includes(s.partnerId),
      ),
    },
    null,
    2,
  ),
);
console.log(
  "Downloaded, reopened and parsed program/decision, redacted plan and selected formula/source bundle.",
);
