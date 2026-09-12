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

test("result plot point selection exposes the selected transient sample", async ({ page }) => {
  const errors = browserErrors(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });

  const examples = page.getByTestId("world-examples");
  await examples.getByRole("button", { name: /RC low-pass/ }).click();
  await page.getByRole("button", { name: "Simulation" }).click();
  await expect(page.getByLabel("Analysis")).toHaveValue("transient");
  await page.getByTestId("simulate-button").click();

  const results = await waitForResults(page);
  const plot = page.getByRole("img", { name: /result plot/i });
  await expect(plot).toBeVisible();
  const points = plot.locator("circle");
  await expect(points).toHaveCount(501);

  const plotBox = await plot.boundingBox();
  expect(plotBox).not.toBeNull();
  await plot.click({ position: { x: plotBox.width / 2, y: plotBox.height / 2 } });

  await expect(results.getByText(/Time \(s\):/)).toBeVisible();
  await expect(results.getByText(/^V\(.+\) \(V\):$/)).toBeVisible();
  await expect(results.getByRole("button", { name: "Clear" })).toBeVisible();
  await expect(results.getByText(/Click the plot to inspect the nearest result point\./)).toHaveCount(0);
  await expect(results.getByText("Circuit Summary", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
