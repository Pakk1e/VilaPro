import test, { expect } from "@playwright/test";

function browserErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

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

test("T-EX-RESULT — selecting a simulation result highlights its location in the schematic", async ({ page }) => {
  const errors = browserErrors(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByTestId("world-examples").getByRole("button", { name: /Voltage divider/ }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resistor 1" })).toBeVisible();
  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
  await page.getByTestId("simulate-button").click();
  const results = await waitForResults(page);

  const resistorRow = results.getByRole("button", { name: "Resistor 1" });
  await expect(resistorRow).toBeVisible();
  await resistorRow.click();
  await expect(resistorRow).toHaveAttribute("aria-pressed", "true");

  const schematic = page.getByRole("img", { name: "Circuit schematic preview" });
  await expect(schematic).toBeVisible();
  const highlightedComponent = schematic.locator('g.cursor-pointer').filter({ hasText: "Resistor 1" });
  await expect(highlightedComponent).toBeVisible();
  await expect(highlightedComponent.locator('rect[stroke="#c26a2e"]')).toBeVisible();
  await expect(page.getByText(/Result location · Resistor 1/)).toBeVisible();
  expect(errors).toEqual([]);
});
