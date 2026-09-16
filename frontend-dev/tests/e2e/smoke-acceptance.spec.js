import { test, expect } from "@playwright/test";

test.describe("Worlds smoke acceptance", () => {
  test("loads the electrical schematic workspace", async ({ page }) => {
    await page.goto("/worlds", { waitUntil: "networkidle" });
    const canvas = page.getByTestId("worlds-canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-world-id", "electrical");
    await expect(canvas).toHaveAttribute("data-layer-id", "circuit");
    await expect(canvas).toHaveAttribute("data-representation-id", "schematic");
  });

  test("opens Library and places a resistor", async ({ page }) => {
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Library" }).click();
    const palette = page.getByTestId("component-palette");
    await expect(palette).toBeVisible();
    await palette.getByRole("button", { name: /Resistor Add to canvas/ }).click();
    await expect(page.getByTestId("placement-layer")).toBeVisible();

    const canvas = page.getByTestId("worlds-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Unable to locate schematic canvas.");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const resistor = page.locator(".react-flow__node").filter({ hasText: "Resistor 1" });
    await expect(resistor).toBeVisible();
    await expect(page.getByTestId("object-local-inspector")).toContainText("Resistor 1");
  });
});
