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

test("diode example renders and solves forward conduction", async ({ page }) => {
  const errors = browserErrors(page);
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /Diode rectifier/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Diode 1" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" }).locator("text").filter({ hasText: "Diode 1" })).toBeVisible();

  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
  await page.getByRole("button", { name: /Simulate/ }).click();

  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 15000 });
  const diodeRow = results.getByRole("button", { name: "Diode 1" });
  await expect(diodeRow).toBeVisible();
  const row = diodeRow.locator("xpath=ancestor::tr");
  await expect(row).toContainText(/0\.7/);
  await expect(results.getByText(/I\(Diode 1\)/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
