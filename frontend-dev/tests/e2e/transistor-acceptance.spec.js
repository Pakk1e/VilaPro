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

test("NPN transistor bias example renders and solves forward-active operation", async ({ page }) => {
  const errors = browserErrors(page);
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /NPN transistor bias/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "NPN Transistor 1" })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" }).locator("text").filter({ hasText: "NPN Transistor 1" })).toHaveCount(1);
  await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
  await page.getByRole("button", { name: /Simulate/ }).click();
  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 15000 });
  const componentResults = results.getByRole("table", { name: "Components result summary" });
  const transistorRow = componentResults.getByRole("button", { name: "NPN Transistor 1" });
  await expect(transistorRow).toBeVisible();
  const row = transistorRow.locator("xpath=ancestor::tr");
  await expect(row).toContainText(/2\s*V/);
  await expect(row).toContainText(/10\.0\s*mA/);
  expect(errors).toEqual([]);
});

test("NPN low-side switch renders and runs a transient switching example", async ({ page }) => {
  const errors = browserErrors(page);
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /NPN low-side switch/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "NPN Transistor 1" })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" })).toBeVisible();
  await expect(page.getByLabel("Analysis")).toHaveValue("transient");
  await page.getByRole("button", { name: /Simulate/ }).click();
  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 20000 });
  await expect(results).toContainText("NPN Transistor 1");
  await expect(results).toContainText("Load resistor");
  expect(errors).toEqual([]);
});
