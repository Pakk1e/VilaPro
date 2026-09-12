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

async function openExample(page, name, componentName) {
  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: componentName })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" })).toBeVisible();
  await expect(page.getByLabel("Analysis")).toHaveValue("transient");
}

test("NMOS low-side switch renders and solves transient switching", async ({ page }) => {
  const errors = browserErrors(page);
  await openExample(page, "NMOS low-side switch", "NMOS 1");
  await page.getByRole("button", { name: /Simulate/ }).click();
  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 20000 });
  await expect(results).toContainText("NMOS 1");
  await expect(results).toContainText("Load resistor");
  expect(errors).toEqual([]);
});

test("PMOS high-side switch renders and solves transient switching", async ({ page }) => {
  const errors = browserErrors(page);
  await openExample(page, "PMOS high-side switch", "PMOS 1");
  await page.getByRole("button", { name: /Simulate/ }).click();
  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 20000 });
  await expect(results).toContainText("PMOS 1");
  await expect(results).toContainText("Load resistor");
  expect(errors).toEqual([]);
});

test("CMOS inverter renders complementary MOSFETs and produces transient results", async ({ page }) => {
  const errors = browserErrors(page);
  await openExample(page, "CMOS inverter", "PMOS 1");
  await expect(page.locator(".react-flow__node").filter({ hasText: "NMOS 1" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Circuit schematic preview" }).locator("text").filter({ hasText: "PMOS 1" })).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Circuit schematic preview" }).locator("text").filter({ hasText: "NMOS 1" })).toHaveCount(1);
  await page.getByRole("button", { name: /Simulate/ }).click();
  const results = page.getByRole("region", { name: "Simulation results" });
  await expect(results).toBeVisible({ timeout: 20000 });
  await expect(results).toContainText("PMOS 1");
  await expect(results).toContainText("NMOS 1");
  await expect(results).toContainText("output");
  expect(errors).toEqual([]);
});
