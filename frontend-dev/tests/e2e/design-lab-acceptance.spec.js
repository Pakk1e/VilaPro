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
  await expect.poll(async () => {
    const box = await node.boundingBox();
    return box?.width ?? 0;
  }, { timeout: 1000 }).toBeGreaterThan(before.width);
});


test("design lab component can be repositioned on the schematic", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  const node = page.getByTestId("design-lab-node-R1");
  await expect(node).toBeVisible();
  const before = await node.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!before || !canvasBox) throw new Error("Unable to measure design lab geometry.");

  const startX = before.x + before.width / 2;
  const startY = before.y + before.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.x ?? before.x;
  }, { timeout: 1000 }).toBeGreaterThan(before.x + 80);
});


test("design lab wire tool creates a connection between component ports", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  await expect(canvas).toBeVisible();
  await canvas.getByRole("button", { name: "Wire tool" }).click();
  await expect(canvas.getByRole("button", { name: "Wire tool" })).toHaveAttribute("aria-label", "Wire tool");

  await page.getByTestId("design-lab-port-R1-right").click();
  await page.getByTestId("design-lab-port-C1-left").click();

  const connection = page.getByTestId("design-lab-connection-R1-C1");
  await expect(connection).toHaveAttribute("x1", "49%");
  await expect(connection).toHaveAttribute("x2", "67%");
});


test("design lab removes the selected component with Backspace", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-C1");
  await node.click();
  await expect(node).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(node).toBeHidden();
});
