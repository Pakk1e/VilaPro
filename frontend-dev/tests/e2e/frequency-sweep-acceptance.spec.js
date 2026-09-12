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

test("RLC frequency sweep produces a frequency-axis response", async ({ page }, testInfo) => {
  const errors = browserErrors(page);
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /RLC transient/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Capacitor 1" })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await page.getByLabel("Analysis").selectOption("frequency_sweep");
  await page.getByRole("spinbutton", { name: /Start/ }).fill("100");
  await page.getByRole("spinbutton", { name: /Stop/ }).fill("10000");
  await page.getByRole("spinbutton", { name: /Step/ }).fill("1000");
  await page.getByRole("button", { name: /Simulate/ }).click();

  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 15000 });
  await expect(results.getByText("Circuit Summary", { exact: true })).toBeVisible();
  const plot = page.getByRole("img", { name: /result plot/i });
  await expect(plot).toBeVisible();
  await expect(plot).toHaveAttribute("aria-label", /versus Frequency \(Hz\) result plot/);
  await expect(plot.locator("circle")).toHaveCount(10);
  await expect(plot.locator("path")).toHaveCount(1);
  await expect(plot.locator("path").first()).toHaveAttribute("d", /L/);
  await expect(results.getByText(/V\(Capacitor 1\)/).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("frequency-sweep-rlc.png"), fullPage: true });
  expect(errors).toEqual([]);
});
