import test, { expect } from "@playwright/test";

async function waitForResults(page) {
  const results = page.getByRole("region", { name: "Simulation results" });
  const error = page.locator('[role="alert"]').filter({ hasText: "Simulation error" }).first();
  await expect.poll(async () => {
    if (await results.isVisible().catch(() => false)) return "results";
    if (await error.isVisible().catch(() => false)) return "error";
    return "pending";
  }, { timeout: 15000 }).not.toBe("pending");
  if (await error.isVisible().catch(() => false)) throw new Error(await error.innerText());
  return results;
}

test("T-EX-PARALLEL — pre-created parallel resistor example uses its DC preset and returns branch values", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/worlds", { waitUntil: "networkidle" });
  const examples = page.getByTestId("world-examples");
  await expect(examples).toBeVisible();
  await examples.getByRole("button", { name: /Parallel resistors/ }).click();

  await expect(page.locator(".react-flow__node").filter({ hasText: "Voltage Source 1" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resistor 1" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resistor 2" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Ground 1" })).toBeVisible();
  await expect.poll(async () => page.locator(".react-flow__edge").count()).toBeGreaterThanOrEqual(6);

  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
  await page.getByTestId("simulate-button").click();
  const results = await waitForResults(page);

  await expect(results.getByText("Circuit Summary", { exact: true })).toBeVisible();
  await expect(results.getByText(/R1|Resistor 1/).first()).toBeVisible();
  await expect(results.getByText(/R2|Resistor 2/).first()).toBeVisible();
  await expect(results.getByText(/10(?:\.0+)?\s*mA/).first()).toBeVisible();
  await expect(results.getByText(/5(?:\.0+)?\s*mA/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
