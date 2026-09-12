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

test("T-EX-RC — pre-created RC low-pass example uses its transient preset and produces a backend result", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/worlds", { waitUntil: "networkidle" });
  const examples = page.getByTestId("world-examples");
  await expect(examples).toBeVisible();
  await examples.getByRole("button", { name: /RC low-pass/ }).click();

  await expect(page.locator(".react-flow__node").filter({ hasText: "Voltage Source 1" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Resistor 1" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Capacitor 1" })).toBeVisible();
  await expect(page.locator(".react-flow__node").filter({ hasText: "Ground 1" })).toBeVisible();
  await expect.poll(async () => page.locator(".react-flow__edge").count()).toBeGreaterThanOrEqual(4);

  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByLabel("Analysis")).toHaveValue("transient");
  await expect(page.getByRole("spinbutton", { name: /Start/ })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: /Stop/ })).toHaveValue("0.005");
  await expect(page.getByRole("spinbutton", { name: /Step/ })).toHaveValue("0.00001");

  const simulate = page.getByTestId("simulate-button");
  await expect(simulate).toBeEnabled();
  await simulate.click();
  const results = await waitForResults(page);
  const plot = page.getByRole("img", { name: /result plot/i });
  await expect(plot).toBeVisible();
  await expect(plot).toHaveAttribute("aria-label", /versus Time \(s\) result plot/);
  await expect(results.getByText("Circuit Summary", { exact: true })).toBeVisible();
  await expect(results.getByText(/V\(Resistor 1\)/).first()).toBeVisible();
  await expect(results.getByText(/V\(Capacitor 1\)/).first()).toBeVisible();
  await expect.poll(async () => (await plot.locator("path").first().getAttribute("d"))?.match(/L/g)?.length ?? 0, { timeout: 15000 }).toBeGreaterThan(50);
  expect(errors).toEqual([]);
});
