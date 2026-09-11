import { test, expect } from "@playwright/test";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;

async function signIn(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("WORLDS_E2E_EMAIL and WORLDS_E2E_PASSWORD must be configured for authenticated Worlds E2E tests.");
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/hub$/);
}

async function addComponent(page, name, label) {
  await page.getByRole("button", { name, exact: false }).click();
  const node = page.locator(".react-flow__node").filter({ hasText: label });
  await expect(node).toBeVisible();
  return node;
}

async function moveNode(page, node, x, y) {
  const box = await node.boundingBox();
  if (!box) throw new Error("Unable to locate ReactFlow node for movement.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

function nodeHandle(node, handleId) {
  return node.locator(`.react-flow__handle[data-handleid="${handleId}"]`);
}

async function createSeriesCircuit(page) {
  const canvas = page.locator(".react-flow");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Unable to locate Worlds canvas.");
  const initialComponent = await addComponent(page, "Resistor", "Resistor 1");
  const zoomOut = page.locator(".react-flow__controls-zoomout");
  for (let i = 0; i < 20; i += 1) {
    if (await zoomOut.isDisabled()) break;
    await zoomOut.click();
  }
  await initialComponent.click();
  await page.keyboard.press("Delete");
  await expect(initialComponent).toHaveCount(0);
  const voltage = await addComponent(page, "Voltage Source", "Voltage Source 1");
  const resistor = await addComponent(page, "Resistor", "Resistor 1");
  const ground = await addComponent(page, "Ground", "Ground 1");
  const palette = page.locator("aside").filter({ hasText: "Palette" }).first();
  const paletteBox = await palette.boundingBox();
  if (!paletteBox) throw new Error("Unable to locate Worlds component palette.");
  const usableLeft = canvasBox.x + 80;
  const usableRight = paletteBox.x - 80;
  const usableWidth = usableRight - usableLeft;
  await moveNode(page, voltage, usableLeft + usableWidth * 0.30, canvasBox.y + canvasBox.height * 0.34);
  await moveNode(page, resistor, usableLeft + usableWidth * 0.70, canvasBox.y + canvasBox.height * 0.34);
  await moveNode(page, ground, usableLeft + usableWidth * 0.50, canvasBox.y + canvasBox.height * 0.68);
  await nodeHandle(voltage, "p").dragTo(nodeHandle(resistor, "p"));
  await nodeHandle(resistor, "n").dragTo(nodeHandle(ground, "g"));
  await nodeHandle(voltage, "n").dragTo(nodeHandle(ground, "g"));
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
}

function installBrowserErrorChecks(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function assertNoBrowserErrors(errors) {
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
}

async function expectSimulationResults(page) {
  await expect(page.getByText("Simulation Results", { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe("Worlds DEV authenticated audit", () => {
  test("authenticated user can enter Worlds and inspect the design workspace", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await expect(page.getByText("Worlds")).toBeVisible();
  });

  test("component placement, selection and properties work", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    const resistor = await addComponent(page, "Resistor", "Resistor 1");
    await resistor.click();
    await expect(page.getByText("Properties")).toBeVisible();
  });

  test("simulation workspace exposes analysis setup and result area", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Simulation" }).click();
    await expect(page.getByText("Simulation Setup", { exact: true })).toBeVisible();
    await expect(page.getByText("No simulation results yet", { exact: true })).toBeVisible();
  });

  test("simulation setup validation is visible for an invalid parameter sweep", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("dc_sweep");
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("real circuit can be drawn, connected and rendered as a schematic", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  });

  test("real circuit runs DC operating point and exposes numerical results", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByRole("button", { name: "Simulate" }).click();
    await expectSimulationResults(page);
  });

  test("real circuit runs static AC and exposes phasor results", async ({ page }) => {
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("ac");
    await page.getByRole("button", { name: "Simulate" }).click();
    await expectSimulationResults(page);
  });

  test("real circuit runs a voltage-source parameter sweep", async ({ page }, testInfo) => {
    const errors = installBrowserErrorChecks(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("dc_sweep");
    await page.getByLabel("Sweep target").selectOption({ label: "Voltage Source 1 (Voltage Source)" });
    const sweepInputs = page.locator('input[type="number"]');
    await sweepInputs.nth(0).fill("0");
    await sweepInputs.nth(1).fill("10");
    await sweepInputs.nth(2).fill("2");
    const simulate = page.getByRole("button", { name: "Simulate" });
    await expect(simulate).toBeEnabled();
    await simulate.click();
    await expectSimulationResults(page);
    await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
    await expect(page.getByText(/Values shown at the last valid sweep point\./).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /result plot/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo, "worlds-parameter-sweep-source-results");
    await assertNoBrowserErrors(errors);
  });

  test("real circuit runs a resistor parameter sweep", async ({ page }, testInfo) => {
    const errors = installBrowserErrorChecks(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("dc_sweep");
    await page.getByLabel("Sweep target").selectOption({ label: "Resistor 1 (Resistor)" });
    await expect(page.getByLabel("Parameter", { exact: true })).toHaveValue("R");
    const sweepInputs = page.locator('input[type="number"]');
    await sweepInputs.nth(0).fill("100");
    await sweepInputs.nth(1).fill("300");
    await sweepInputs.nth(2).fill("100");
    const simulate = page.getByRole("button", { name: "Simulate" });
    await expect(simulate).toBeEnabled();
    await simulate.click();
    await expectSimulationResults(page);
    await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /result plot/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo, "worlds-parameter-sweep-resistor-results");
    await assertNoBrowserErrors(errors);
  });
});
