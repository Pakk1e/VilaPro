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
  await expect(connection).toHaveAttribute("data-from-side", "right");
  await expect(connection).toHaveAttribute("data-to-side", "left");
  await expect(connection).toHaveAttribute("d", "M 52 46 H 64");
});


test("design lab removes the selected component with Backspace", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-C1");
  await node.click();
  await expect(node).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(node).toBeHidden();
});

test("design lab undo restores the last document edit and redo reapplies it", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-C1");

  await node.click();
  await page.keyboard.press("Backspace");
  await expect(node).toBeHidden();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(node).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(node).toBeHidden();
});

test("design lab undo restores a moved component", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");
  const before = await node.boundingBox();
  if (!before) throw new Error("Unable to measure design lab component.");

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

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.x ?? before.x + 1000;
  }, { timeout: 1000 }).toBeLessThan(before.x + 20);
});

test("design lab places a new component from the library onto the canvas", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  await expect(canvas).toBeVisible();

  await canvas.getByRole("button", { name: "Add component" }).click();
  await expect(page.getByText("Component library")).toBeVisible();

  await page.getByRole("button", { name: /Resistor/ }).click();
  await expect(canvas.getByText("Click on the schematic to place Resistor")).toBeVisible();

  await canvas.click({ position: { x: 520, y: 360 } });

  const placed = page.getByTestId("design-lab-node-R2");
  await expect(placed).toBeVisible();
});

test("design lab inspector edits a component value", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");
  await node.click();

  const inspector = page.getByTestId("design-lab-inspector");
  await expect(inspector).toBeVisible();

  const value = inspector.getByTestId("design-lab-property-value");
  await expect(value).toHaveValue("1 kΩ");
  await value.fill("470 Ω");
  await value.blur();

  await expect(value).toHaveValue("470 Ω");
  await expect(node.getByText("470 Ω")).toBeVisible();
});

test("design lab duplicates a selected connected group with its internal wire", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");

  await resistor.click();
  await capacitor.click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");

  await canvas.getByRole("button", { name: "Wire tool" }).click();
  await page.getByTestId("design-lab-port-R1-right").click();
  await page.getByTestId("design-lab-port-C1-left").click();
  await expect(page.getByTestId("design-lab-connection-R1-C1")).toHaveAttribute("data-from-side", "right");

  await page.getByRole("button", { name: "Select tool" }).click();
  await page.getByTestId("design-lab-node-R1").click();
  await page.getByTestId("design-lab-node-C1").click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Duplicate" }).click();

  await expect(page.getByTestId("design-lab-node-R2")).toBeVisible();
  await expect(page.getByTestId("design-lab-node-C2")).toBeVisible();
  await expect(page.getByTestId("design-lab-connection-R2-C2")).toHaveAttribute("data-from-side", "right");
  await expect(page.getByTestId("design-lab-connection-R2-C2")).toHaveAttribute("data-to-side", "left");
  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");
});

test("design lab rotates the selected component by 90 degrees", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");
  await node.click();

  await expect(page.getByRole("button", { name: "Rotate" })).toBeVisible();
  await page.getByRole("button", { name: "Rotate" }).click();

  await expect(node).toHaveAttribute("data-rotation", "90");
});

test("design lab marquee selects components inside the selection box", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");
  const resistorBox = await resistor.boundingBox();
  const capacitorBox = await capacitor.boundingBox();
  if (!resistorBox || !capacitorBox) throw new Error("Unable to measure schematic nodes.");

  const startX = resistorBox.x - 40;
  const startY = resistorBox.y - 40;
  const endX = capacitorBox.x + capacitorBox.width + 40;
  const endY = capacitorBox.y + capacitorBox.height + 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 8 });
  await expect(page.getByTestId("design-lab-marquee")).toBeVisible();
  await page.mouse.up();

  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");
});

test("design lab pan tool moves the schematic viewport without moving component geometry", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  const node = page.getByTestId("design-lab-node-R1");
  const before = await node.boundingBox();
  if (!before) throw new Error("Unable to measure schematic node.");

  await page.getByRole("button", { name: "Pan" }).click();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Unable to measure canvas.");

  const startX = canvasBox.x + canvasBox.width * 0.48;
  const startY = canvasBox.y + canvasBox.height * 0.75;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 30, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.x ?? before.x;
  }, { timeout: 1000 }).toBeGreaterThan(before.x + 60);
  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.y ?? before.y;
  }, { timeout: 1000 }).toBeGreaterThan(before.y + 10);
});

test("design lab supports multi-selection with Shift-click", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");

  await resistor.click();
  await capacitor.click({ modifiers: ["Shift"] });

  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");
});

test("design lab deletes all selected components together", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");

  await resistor.click();
  await capacitor.click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");

  await page.keyboard.press("Delete");

  await expect(resistor).toBeHidden();
  await expect(capacitor).toBeHidden();
});

test("design lab clears multi-selection with Escape", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");

  await resistor.click();
  await capacitor.click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");

  await page.keyboard.press("Escape");

  await expect(page.getByTestId("design-lab-selection-count")).toBeHidden();
  await expect(page.getByRole("button", { name: "Rotate" })).toBeHidden();
});

test("design lab moves the selected group together", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const resistor = page.getByTestId("design-lab-node-R1");
  const capacitor = page.getByTestId("design-lab-node-C1");

  await resistor.click();
  const capacitorBefore = await capacitor.boundingBox();
  const resistorBefore = await resistor.boundingBox();
  if (!capacitorBefore || !resistorBefore) throw new Error("Unable to measure selected group.");

  await capacitor.click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("design-lab-selection-count")).toHaveText("2 selected");

  const startX = resistorBefore.x + resistorBefore.width / 2;
  const startY = resistorBefore.y + resistorBefore.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () => {
    const after = await capacitor.boundingBox();
    return after?.x ?? capacitorBefore.x;
  }, { timeout: 1000 }).toBeGreaterThan(capacitorBefore.x + 60);
});


test("design lab supports CAD keyboard tool shortcuts", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");

  await canvas.focus();
  await page.keyboard.press("w");
  await expect(canvas.getByRole("button", { name: "Wire tool" })).toHaveClass(/bg-slate-100/);

  await page.keyboard.press("p");
  await expect(canvas.getByRole("button", { name: "Pan" })).toHaveClass(/bg-slate-100/);

  await page.keyboard.press("v");
  await expect(canvas.getByRole("button", { name: "Select tool" })).toHaveClass(/bg-slate-100/);
});

test("design lab supports duplicate and undo with keyboard shortcuts", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");

  await node.click();
  await page.keyboard.press("Control+d");
  await expect(page.getByTestId("design-lab-node-R2")).toBeVisible();

  await page.keyboard.press("Control+z");
  await expect(page.getByTestId("design-lab-node-R2")).toBeHidden();

  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByTestId("design-lab-node-R2")).toBeVisible();
});

test("design lab ignores document shortcuts while editing component values", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");
  await node.click();

  const value = page.getByTestId("design-lab-property-value");
  await value.fill("470");
  await value.press("Control+d");
  await expect(page.getByTestId("design-lab-node-R2")).toBeHidden();
});


test("design lab selects and deletes a schematic wire", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  await canvas.getByRole("button", { name: "Wire tool" }).click();
  await page.getByTestId("design-lab-port-R1-right").click();
  await page.getByTestId("design-lab-port-C1-left").click();

  const wire = page.getByTestId("design-lab-connection-R1-C1");
  await expect(wire).toBeVisible();

  const box = await wire.boundingBox();
  if (!box) throw new Error("Unable to measure schematic wire.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(wire).toHaveAttribute("data-selected", "true");

  await page.keyboard.press("Delete");
  await expect(wire).toBeHidden();
});


test("design lab snaps moved components to the schematic grid", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const node = page.getByTestId("design-lab-node-R1");
  await node.click();

  const box = await node.boundingBox();
  if (!box) throw new Error("Unable to measure schematic node.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 37, box.y + box.height / 2 + 19, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () => {
    const style = await node.getAttribute("style");
    const left = Number.parseFloat(style?.match(/left:\s*([0-9.]+)%/)?.[1] ?? "NaN");
    const top = Number.parseFloat(style?.match(/top:\s*([0-9.]+)%/)?.[1] ?? "NaN");
    return { left, top };
  }).toEqual(expect.objectContaining({
    left: expect.any(Number),
    top: expect.any(Number),
  }));
  const snapped = await node.getAttribute("style");
  const left = Number.parseFloat(snapped?.match(/left:\s*([0-9.]+)%/)?.[1] ?? "NaN");
  const top = Number.parseFloat(snapped?.match(/top:\s*([0-9.]+)%/)?.[1] ?? "NaN");
  expect(left).toBeGreaterThan(49);
  expect(left % 2).toBe(0);
  expect(top % 2).toBe(0);
});

test("design lab toggles grid snapping with G", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const grid = page.getByRole("button", { name: "Grid snap" });
  await expect(grid).toHaveClass(/bg-slate-100/);

  await page.getByTestId("design-lab-canvas").focus();
  await page.keyboard.press("g");
  await expect(grid).not.toHaveClass(/bg-slate-100/);

  await page.keyboard.press("g");
  await expect(grid).toHaveClass(/bg-slate-100/);
});


test("design lab nudges a selected component with arrow keys", async ({ page }) => {
  await page.goto("/worlds/design-lab", { waitUntil: "networkidle" });
  const canvas = page.getByTestId("design-lab-canvas");
  const node = page.getByTestId("design-lab-node-R1");

  await node.click();
  const before = await node.boundingBox();
  if (!before) throw new Error("Unable to measure schematic node.");

  await canvas.focus();
  await page.keyboard.press("ArrowRight");

  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.x ?? before.x;
  }).toBeGreaterThan(before.x + 1);

  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => {
    const after = await node.boundingBox();
    return after?.x ?? before.x;
  }).toBeGreaterThan(before.x + 10);
});
