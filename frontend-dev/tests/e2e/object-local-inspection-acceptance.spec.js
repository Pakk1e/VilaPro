import { test, expect } from "@playwright/test";

test("selected component exposes object-local inspection", async ({ page }) => {
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Library" }).click();
  const palette = page.getByTestId("component-palette");
  await palette.getByRole("button", { name: /Resistor Add to canvas/ }).click();
  await expect(page.getByTestId("placement-layer")).toBeVisible();
  const canvas = page.getByTestId("worlds-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Unable to locate schematic canvas.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const resistor = page.locator(".react-flow__node").filter({ hasText: "Resistor 1" });
  await expect(resistor).toBeVisible();
  const local = page.getByTestId("workspace-inspector");
  await expect(local).toBeVisible();
  await expect(local).toContainText("Resistor 1");
  await expect(local).toContainText("Resistance");
  const resistance = local.getByRole("spinbutton", { name: "Object Resistance" });
  await expect(resistance).toHaveValue("100");
  await resistance.fill("470");
  await expect.poll(async () => (await page.evaluate(() => window.__WORLDS_DEBUG__?.nodes?.find(node => node.data?.label === "Resistor 1")?.data?.properties?.resistance))).toBe(470);
  await local.getByRole("button", { name: "Current" }).click();
  await expect(page.getByTestId("instrument-probes")).toContainText("Resistor 1");
  await expect(page.getByTestId("instrument-probes")).toContainText("current");
});
