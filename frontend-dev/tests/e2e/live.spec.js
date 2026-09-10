import { test, expect } from "@playwright/test";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;
const EXPECTED_AUTH_401 = "Failed to load resource: the server responded with a status of 401 ()";

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

test("authenticated user can start, pause, resume and stop Live DC", async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text() !== EXPECTED_AUTH_401) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signIn(page);
  await page.goto("/worlds", { waitUntil: "networkidle" });
  await createSeriesCircuit(page);
  await page.getByRole("button", { name: "Simulation" }).click();
  await page.getByRole("button", { name: "Live" }).click();
  await expect(page.getByRole("button", { name: "Start Live" })).toBeEnabled();
  await expect(page.getByText("Live mode keeps a session open and updates the current sampled state.")).toBeVisible();

  await page.getByRole("button", { name: "Start Live" }).click();
  const liveState = page.getByRole("region", { name: "Live simulation state" });
  await expect(liveState).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(liveState.getByText("Waiting for the first simulation update.")).toHaveCount(0, { timeout: 10000 });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(page.locator("header").getByText("paused", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator("header").getByText("cancelled", { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
