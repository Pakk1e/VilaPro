import { test, expect } from "@playwright/test";

test("design lab zoom changes schematic scale", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  await expect(canvas).toBeVisible();
  const node = page.getByTestId("design-lab-node-R1");
  await expect(node).toBeVisible();
  const before = await node.boundingBox();
  if (!before) throw new Error("Unable to measure design lab component.");
  await canvas.getByRole("button", { name: "+" }).click();
  await expect(canvas.getByText("110%")).toBeVisible();
  const after = await node.boundingBox();
  if (!after) throw new Error("Unable to measure zoomed design lab component.");
  expect(after.width).toBeGreaterThan(before.width);
});
