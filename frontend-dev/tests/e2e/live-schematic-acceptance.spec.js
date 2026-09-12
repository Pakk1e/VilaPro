import { test, expect } from "@playwright/test";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;

async function signIn(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("WORLDS_E2E_EMAIL and WORLDS_E2E_PASSWORD must be configured for authenticated Worlds E2E tests.");
  await page.goto("/login", { waitUntil: "networkidle" });
  if (/\/hub$/.test(page.url())) return;
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/hub$/);
}

function browserErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("live simulation shows component measurements and current direction on the schematic", async ({ page }, testInfo) => {
  const errors = browserErrors(page);
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /Voltage divider/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resistor 1" })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await page.getByRole("button", { name: "Live" }).click();
  await page.getByRole("button", { name: "Start Live" }).click();

  const schematic = page.getByRole("img", { name: "Circuit schematic preview" });
  await expect(schematic).toBeVisible();
  await expect(page.getByText("Live circuit measurements", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Arrow = conventional current direction", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("positive current: p → n", { exact: true })).toBeVisible();
  await expect(schematic.locator("text").filter({ hasText: /^V / }).first()).toBeVisible({ timeout: 10000 });
  await expect(schematic.locator("text").filter({ hasText: /^I / }).first()).toBeVisible({ timeout: 10000 });
  await expect(schematic.locator("marker#live-current-arrow")).toHaveCount(1);
  await expect(schematic.locator("line[marker-end='url(#live-current-arrow)']")).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath("live-schematic-measurements.png"), fullPage: true });

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator("header").getByText("cancelled", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
