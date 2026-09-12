import { test, expect } from "@playwright/test";

function browserErrors(page) {
  const errors = [];
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  return errors;
}

test.describe("Electrical workspace UI rework", () => {
  test("contextual surfaces, library, inspector and instrument panel are wired to the workspace", async ({ page }) => {
    const errors = browserErrors(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });

    await expect(page.getByTestId("electrical-workspace")).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-canvas-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-inspector-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-instrument-surface")).toBeVisible();
    await expect(page.getByTestId("component-library")).toBeVisible();
    await expect(page.getByTestId("workspace-inspector")).toBeVisible();
    await expect(page.getByTestId("simulation-panel")).toBeVisible();

    await page.getByLabel("Search components").fill("NMOS");
    await expect(page.getByTestId("component-palette").getByRole("button", { name: /NMOS Add to canvas/ })).toBeVisible();
    await expect(page.getByTestId("component-palette").getByRole("button", { name: /Resistor Add to canvas/ })).toHaveCount(0);
    await page.getByTestId("component-palette").getByRole("button", { name: /NMOS Add to canvas/ }).click();

    await expect(page.locator(".react-flow__node").filter({ hasText: "NMOS 1" })).toBeVisible();
    await expect(page.getByTestId("workspace-inspector")).toContainText("NMOS 1");

    await page.getByRole("button", { name: "Simulation" }).click();
    await expect(page.getByTestId("workspace-instrument-surface")).toContainText("Analysis");
    await expect(page.getByTestId("simulation-setup")).toBeVisible();
    await expect(page.getByTestId("worlds-canvas").locator(".react-flow")).toHaveCSS("opacity", "0");
    await expect(page.getByTestId("workspace-canvas-surface")).toContainText("Simulation");

    await page.getByTestId("instrument-resize-handle").hover();
    const handle = page.getByTestId("instrument-resize-handle");
    const box = await handle.boundingBox();
    if (!box) throw new Error("Unable to locate instrument resize handle.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 80, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId("workspace-instrument-surface")).toBeVisible();

    await page.getByRole("button", { name: "Focus" }).click();
    await expect(page.getByTestId("electrical-workspace")).toHaveAttribute("data-focus-mode", "true");
    await expect(page.getByTestId("workspace-canvas-surface")).toBeVisible();
    await expect(page.getByTestId("workspace-library-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-inspector-surface")).toHaveCount(0);
    await expect(page.getByTestId("workspace-instrument-surface")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
