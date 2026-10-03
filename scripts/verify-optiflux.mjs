import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const dir = ".launchguild-local";
const files = (await fs.readdir(dir)).filter((f) =>
  /^[a-f0-9-]{36}\.json$/.test(f),
);
const jobs = await Promise.all(
  files.map(async (f) => JSON.parse(await fs.readFile(`${dir}/${f}`, "utf8"))),
);
const owner = jobs.find((j) => j.run.status === "needs-review")?.owner;
if (!owner) throw Error("A genuine completed local run is required.");
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  // Inspect the existing session in an isolated QA browser; never export its cookie.
  await context.addCookies([
    {
      name: "launchguild-local-session",
      value: owner,
      domain: "localhost",
      path: "/api/local-agent",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const proof = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, name] of [
      ["/", "landing"],
      ["/login", "login"],
      ["/demo", "overview"],
      ["/demo/agents", "agents"],
    ]) {
      await page.goto(`http://localhost:3210${route}`);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (route.startsWith("/demo"))
        await page.locator(".app-footer").waitFor();
      if (route === "/demo/agents")
        await page.getByRole("heading", { name: "Smith’s take" }).waitFor();
      await page.evaluate(async () => {
        await Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        );
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow) throw Error(`${name} overflows at ${width}`);
      await page.screenshot({
        path: `media/screenshots/optiflux-${name}-${width}.png`,
        fullPage: name !== "landing",
      });
      if (route === "/") {
        await page.getByRole("link", { name: "Scroll to discover" }).click();
        await page.locator("#first-five").waitFor({ state: "visible" });
        await page.screenshot({
          path: `media/screenshots/optiflux-editorial-${width}.png`,
          fullPage: true,
        });
        await page
          .getByRole("link", { name: "GET STARTED", exact: true })
          .click();
        await page.waitForURL("**/demo");
      }
      proof.push({ route, width, overflow });
    }
  }
  await page.reload();
  await page.getByRole("heading", { name: "Smith’s take" }).waitFor();
  await page.locator(".source-links button").first().click();
  await page.getByRole("dialog").waitFor();
  if (!(await page.getByRole("dialog").innerText()).includes("Salesforce"))
    throw Error("Exact source did not open");
  await page.getByRole("button", { name: "Close dialog" }).click();
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    "artifacts/optiflux-browser-proof.json",
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        reference: "https://optiflux.polsia.app/",
        surfaces: proof,
        checks: [
          "primary CTA opens workspace",
          "scroll cue opens editorial section",
          "actual saved model result visible",
          "result survives refresh",
          "source button opens exact source",
          "no page errors",
        ],
        realRuns: jobs
          .filter((j) => j.owner === owner && j.run.status === "needs-review")
          .map((j) => ({
            role: j.run.role,
            requestId: j.run.requestId,
            status: j.run.status,
            tokens: j.run.tokens,
          })),
      },
      null,
      2,
    ),
  );
  console.log(
    "Optiflux design: desktop/mobile, genuine saved analysis, refresh, citations and CTA verified.",
  );
} finally {
  await browser.close();
}
