import { test, expect } from "@playwright/test";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;

async function signIn(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error("WORLDS_E2E_EMAIL and WORLDS_E2E_PASSWORD must be configured.");
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
  if (!box) throw new Error("Unable to locate ReactFlow node.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

function handle(node, id) {
  return node.locator(`.react-flow__handle[data-handleid="${id}"]`);
}

async function createSeriesCircuit(page) {
  const canvas = page.locator(".react-flow");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Unable to locate Worlds canvas.");

  const seed = await addComponent(page, "Resistor", "Resistor 1");
  const zoomOut = page.locator(".react-flow__controls-zoomout");
  for (let i = 0; i < 20; i += 1) {
    if (await zoomOut.isDisabled()) break;
    await zoomOut.click();
  }
  await seed.click();
  await page.keyboard.press("Delete");
  await expect(seed).toHaveCount(0);

  const voltage = await addComponent(page, "Voltage Source", "Voltage Source 1");
  const resistor = await addComponent(page, "Resistor", "Resistor 1");
  const ground = await addComponent(page, "Ground", "Ground 1");
  const palette = page.locator("aside").filter({ hasText: "Palette" }).first();
  const paletteBox = await palette.boundingBox();
  if (!paletteBox) throw new Error("Unable to locate component palette.");

  const left = canvasBox.x + 80;
  const right = paletteBox.x - 80;
  const width = right - left;
  if (width < 300) throw new Error("Insufficient canvas width for acceptance circuit.");
  const top = canvasBox.y + canvasBox.height * 0.34;
  const bottom = canvasBox.y + canvasBox.height * 0.68;

  await moveNode(page, voltage, left + width * 0.30, top);
  await moveNode(page, resistor, left + width * 0.70, top);
  await moveNode(page, ground, left + width * 0.50, bottom);
  await handle(voltage, "p").dragTo(handle(resistor, "p"));
  await handle(resistor, "n").dragTo(handle(ground, "g"));
  await handle(voltage, "n").dragTo(handle(ground, "g"));
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);

  return { voltage, resistor };
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

async function captureVisual(page, testInfo, name) {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  });
}

async function captureElementVisual(locator, testInfo, name) {
  await expect(locator).toBeVisible();
  await locator.screenshot({
    path: testInfo.outputPath(`${name}.png`),
  });
}

function browserErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Worlds acceptance suite", () => {
  test("T01 — basic 10 V / 1 kΩ DC operating point", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    const { voltage, resistor } = await createSeriesCircuit(page);

    const numberInputs = page.locator('input[type="number"]');
    await voltage.click();
    await numberInputs.first().fill("10");
    await resistor.click();
    await numberInputs.first().fill("1000");

    await page.getByRole("button", { name: "Simulation" }).click();
    await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
    await page.getByRole("button", { name: "Simulate" }).click();
    const results = await waitForResults(page);
    await expect(results.getByText(/10\.?0+\s*(V)?/).first()).toBeVisible();
    await expect(results.getByText(/10\.?0+\s*mA/).first()).toBeVisible();
    await captureVisual(page, testInfo, "T01-dc-operating-point");
    await captureElementVisual(results, testInfo, "T01-dc-operating-point-results");
    expect(errors).toEqual([]);
  });

  test("T05 — resistor Parameter Sweep 500/1000/1500 Ω", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    const { voltage } = await createSeriesCircuit(page);
    await voltage.click();
    await page.locator('input[type="number"]').first().fill("10");
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("dc_sweep");
    await page.getByLabel("Sweep target").selectOption({ label: "Resistor 1 (Resistor)" });
    await expect(page.getByLabel("Parameter", { exact: true })).toHaveValue("R");
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("500");
    await inputs.nth(1).fill("1500");
    await inputs.nth(2).fill("500");
    await page.getByRole("button", { name: "Simulate" }).click();
    const results = await waitForResults(page);
    const plot = page.getByRole("img", { name: /result plot/i });
    await expect(plot).toBeVisible();
    await expect(plot).toHaveAttribute("aria-label", /I\(Voltage Source 1\)/);
    await expect(results.getByText(/6\.67/).first()).toBeVisible();
    await expect(plot.locator("circle")).toHaveCount(3);
    await expect(plot.locator("path")).toHaveCount(1);
    await expect(plot.locator("path").first()).toHaveAttribute("d", /L/);
    await captureVisual(page, testInfo, "T05-parameter-sweep");
    await captureElementVisual(plot, testInfo, "T05-parameter-sweep-plot");
    expect(errors).toEqual([]);
  });

  test("T08 — transient response plot", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("transient");
    await expect(page.getByText(/Start|Stop|Step/).first()).toBeVisible();
    const waveformControls = page.getByText(/Sine|waveform/i);
    if (await waveformControls.count()) await expect(waveformControls.first()).toBeVisible();
    const simulate = page.getByRole("button", { name: "Simulate" });
    await expect(simulate).toBeEnabled();
    await simulate.click();
    const results = await waitForResults(page);
    const plot = page.getByRole("img", { name: /result plot/i });
    await expect(plot).toBeVisible();
    await expect(plot).toHaveAttribute("aria-label", /V\(Voltage Source 1\)/);
    await expect(results).toBeVisible();
    await captureVisual(page, testInfo, "T08-transient-response");
    await captureElementVisual(plot, testInfo, "T08-transient-response-plot");
    expect(errors).toEqual([]);
  });

  test("T09 — static AC resistor phasor result", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("ac");
    const frequency = page.getByLabel("Frequency");
    const amplitude = page.getByLabel("Amplitude");
    const phase = page.getByLabel("Phase");
    await frequency.fill("1000");
    await amplitude.fill("5");
    await phase.fill("0");
    await page.getByRole("button", { name: "Simulate" }).click();
    const results = page.getByRole("region", { name: "AC phasor results" });
    await expect(results).toBeVisible({ timeout: 15000 });
    await expect(results.getByText("AC Phasors", { exact: true })).toBeVisible();
    await expect(results.getByText(/1,?000(?:\.0+)?/).first()).toBeVisible();
    await expect(results.getByText("Phasor values", { exact: true })).toBeVisible();
    await expect(results.getByText("V(Node 2)", { exact: true })).toBeVisible();
    await expect(results.getByText(/Variable\(name=/)).toHaveCount(0);
    await captureVisual(page, testInfo, "T09-static-ac-phasor");
    await captureElementVisual(results, testInfo, "T09-static-ac-phasor-results");
    expect(errors).toEqual([]);
  });

  test("T13 — Live AC instantaneous waveform is smooth sinusoid", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByRole("button", { name: "Live" }).click();
    await page.getByLabel("Analysis").selectOption("ac");
    await page.getByLabel("Frequency").fill("1");
    await page.getByLabel("Amplitude").fill("5");
    await page.getByLabel("Phase").fill("0");
    await page.getByRole("button", { name: "Start Live" }).click();

    const live = page.getByRole("region", { name: "Live simulation state" });
    await expect(live.getByText(/· Instantaneous$/).first()).toBeVisible({ timeout: 15000 });
    const plot = live.getByRole("img", { name: /live simulation plot/i }).first();
    await expect(plot).toBeVisible();
    const path = plot.locator("path").first();
    await expect.poll(async () => (await path.getAttribute("d"))?.match(/L/g)?.length ?? 0, { timeout: 15000 }).toBeGreaterThan(50);

    const d = await path.getAttribute("d");
    const points = [...(d.matchAll(/[ML]\s+([\d.]+)\s+([\d.]+)/g))].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(points.length).toBeGreaterThan(50);
    const turns = points.slice(1).map((p, i) => Math.sign(p.y - points[i].y)).filter((v) => v !== 0);
    const directionChanges = turns.slice(1).filter((v, i) => v !== turns[i]).length;
    expect(directionChanges).toBeGreaterThanOrEqual(2);
    await captureVisual(page, testInfo, "T13-live-ac-smooth-sine");
    await captureElementVisual(plot, testInfo, "T13-live-ac-smooth-sine-plot");
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Stop" }).click();
  });

  test("T16 — invalid AC frequency is rejected", async ({ page }, testInfo) => {
    const errors = browserErrors(page);
    await signIn(page);
    await page.goto("/worlds", { waitUntil: "networkidle" });
    await createSeriesCircuit(page);
    await page.getByRole("button", { name: "Simulation" }).click();
    await page.getByLabel("Analysis").selectOption("ac");
    await page.getByLabel("Frequency").fill("0");
    const simulate = page.getByRole("button", { name: "Simulate" });
    await expect(simulate).toBeDisabled();
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
    await captureVisual(page, testInfo, "T16-invalid-ac-frequency");
    expect(errors).toEqual([]);
  });
});
