import { test, expect } from "@playwright/test";
test("local execution requires same-origin session and rejects unrelated program input", async ({
  request,
}) => {
  const anonymous = await request.post("/api/local-agent", {
    headers: { origin: "http://localhost:3210" },
    data: {},
  });
  expect(anonymous.status()).toBe(403);
  const cross = await request.get("/api/local-agent", {
    headers: { "sec-fetch-site": "cross-site" },
  });
  expect(await cross.json()).toEqual({ enabled: false, runs: [] });
  const session = await request.get("/api/local-agent");
  expect((await session.json()).runs).toEqual([]);
  const attack = await request.post("/api/local-agent", {
    headers: { origin: "https://evil.example" },
    data: {},
  });
  expect(attack.status()).toBe(403);
  const malformed = await request.post("/api/local-agent", {
    headers: { origin: "http://localhost:3210" },
    data: { role: "shell", state: { mode: "live" } },
  });
  expect(malformed.status()).toBe(400);
  const cancel = await request.delete("/api/local-agent", {
    headers: { origin: "http://localhost:3210" },
    data: { id: crypto.randomUUID() },
  });
  expect(cancel.status()).toBe(400);
});
test("agent roles and responsive navigation remain accessible without running a model", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/demo/agents");
  await expect(
    page.getByRole("link", { name: "Agents", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Treasurer/ }).click();
  await expect(
    page.getByRole("heading", { name: "Check the path to revenue." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run Treasurer" }),
  ).toBeVisible();
  await expect(
    page.getByText("No task has been run for this role yet.", { exact: false }),
  ).toBeVisible();
});
