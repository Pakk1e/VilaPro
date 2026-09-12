import { test, expect } from "@playwright/test";

function browserErrors(page) {
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  return errors;
}

test.describe("Electrical workspace UI rework", () => {
  test("canvas-first workspace reveals contextual tools when needed", async ({ page }) => {
    const errors = browserErrors(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await expect(page.getByTestId("electrical-workspace")).toBeVisible();
    await expect(page.getByTestId("workspace-canvas-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-inspector-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-instrument-surface")).toHaveCount(0);

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.getByTestId("workspace-library-surface")).toBeVisible();
    await expect(page.getByTestId("component-library")).toBeVisible();
    await page.getByLabel("Search components").fill("NMOS");
    await expect(page.getByTestId("component-palette").getByRole("button", { name: /NMOS Add to canvas/ })).toBeVisible();
    await expect(page.getByTestId("component-palette").getByRole("button", { name: /Resistor Add to canvas/ })).toHaveCount(0);
    await page.getByTestId("component-palette").getByRole("button", { name: /NMOS Add to canvas/ }).click();

    const nmos = page.locator(".react-flow__node").filter({ hasText: "NMOS 1" });
    await expect(nmos).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-inspector-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-inspector")).toContainText("NMOS 1");

    const terminalHandle = nmos.locator(".react-flow__handle").first();
    await expect(terminalHandle).toBeVisible();
    await terminalHandle.click({ force: true });
    await expect(page.getByTestId("workspace-inspector")).toContainText("Terminal");
    await expect(page.getByTestId("workspace-inspector")).toContainText("Measure");
    await page.getByTestId("workspace-inspector").getByRole("button", { name: "Voltage" }).click();
    await expect(page.getByTestId("instrument-probes")).toContainText("NMOS 1");
    await expect(page.getByTestId("instrument-probes")).toContainText("voltage");
    await expect(page.getByTestId("workspace-instrument-surface")).toBeVisible();
    await page.getByTestId("instrument-probes").getByRole("button", { name: /Remove NMOS 1 voltage probe/ }).click();
    await expect(page.getByTestId("instrument-probes")).toHaveCount(0);

    await page.getByRole("button", { name: "Library" }).click();
    await expect(page.getByTestId("workspace-library-surface")).toBeVisible();
    const divider = page.getByTestId("world-examples").getByRole("button", { name: /Voltage divider/ });
    await expect(divider).toBeVisible();
    await divider.click();
    await expect(page.locator(".react-flow__node").filter({ hasText: "V1" })).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toHaveCount(0);

    await page.getByRole("button", { name: "Simulation" }).click();
    await expect(page.getByTestId("simulation-panel")).toBeVisible();
    await expect(page.getByTestId("simulation-setup")).toBeVisible();
    await expect(page.getByTestId("worlds-canvas").locator(".react-flow")).toHaveCSS("opacity", "0");
    await expect(page.getByTestId("workspace-canvas-surface")).toContainText("Simulation");

    await page.getByTestId("simulate-button").click();
    await expect(page.getByRole("region", { name: "Simulation results" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("region", { name: "Simulation results" })).toContainText("Circuit Summary");
    const componentRow = page.getByRole("region", { name: "Simulation results" }).getByRole("button", { name: /R1/ }).first();
    await expect(componentRow).toBeVisible();
    await componentRow.click();
    await expect(page.getByRole("region", { name: "Simulation results" })).toContainText("Selected");

    await expect(page.getByTestId("workspace-instrument-surface")).toBeVisible();
    const handle = page.getByTestId("instrument-resize-handle");
    const box = await handle.boundingBox();
    if (!box) throw new Error("Unable to locate instrument resize handle.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 80, { steps: 5 });
    await page.mouse.up();

    await page.getByRole("button", { name: "Focus" }).click();
    await expect(page.getByTestId("electrical-workspace")).toHaveAttribute("data-focus-mode", "true");
    await expect(page.getByTestId("workspace-canvas-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-inspector-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-instrument-surface")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
