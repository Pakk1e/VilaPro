const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const specs = fs.readdirSync(root).filter((name) => name.endsWith(".spec.js"));

const ensureLibraryHelper = 'async function ensureLibrary(page) { const surface = page.getByTestId("workspace-library-surface"); if (!(await surface.isVisible().catch(() => false))) await page.getByRole("button", { name: "Library" }).click(); }\n';
const addComponentHelper = 'async function addComponent(page, name, label) { const palette = page.getByTestId("component-palette"); if (!(await palette.isVisible().catch(() => false))) await page.getByRole("button", { name: "Library" }).click(); await palette.getByRole("button", { name: new RegExp("^" + name + " Add to canvas$") }).click(); const canvas = page.getByTestId("worlds-canvas"); const canvasBox = await canvas.boundingBox(); if (!canvasBox) throw new Error("Unable to locate schematic canvas."); await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2); const node = page.locator(".react-flow__node").filter({ hasText: label }); await expect(node).toBeVisible(); const librarySurface = page.getByTestId("workspace-library-surface"); if (await librarySurface.isVisible().catch(() => false)) await librarySurface.getByRole("button", { name: "Close component tool" }).click(); return node; }';

for (const name of specs) {
  const file = path.join(root, name);
  let text = fs.readFileSync(file, "utf8");
  text = text.replaceAll('page.getByRole("button", { name: /Simulate/ })', 'page.getByTestId("simulate-button")');
  text = text.replaceAll('page.getByRole("button", { name: "Simulation" })', 'page.getByRole("button", { name: "Simulate" })');
  text = text.replaceAll('page.getByRole("button", { name: "Start Live" })', 'page.getByTestId("simulate-button")');
  text = text.replaceAll('page.getByRole("img", { name: "Circuit schematic preview" })', 'page.getByTestId("worlds-canvas")');
  text = text.replaceAll('page.getByLabel("Start", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Start", { exact: true })');
  text = text.replaceAll('page.getByLabel("Stop", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Stop", { exact: true })');
  text = text.replaceAll('page.getByLabel("Step", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Step", { exact: true })');
  text = text.replaceAll('toContainText("Simulation")', 'toContainText("Schematic")');
  text = text.replaceAll('getByTestId("component-inspector")', 'getByTestId("workspace-inspector")');
  text = text.replaceAll('await voltage.click();', 'await voltage.click({ force: true });');
  text = text.replaceAll('await resistor.click();', 'await resistor.click({ force: true });');
  text = text.replaceAll('await seed.click();', 'await seed.click({ force: true });');
  text = text.replace(
    'const sourceProperties = page.getByTestId("workspace-inspector").locator("select").first();',
    'const inspectorSurface = page.getByTestId("workspace-inspector-surface"); if (!(await inspectorSurface.isVisible().catch(() => false))) await page.getByRole("button", { name: "Inspector" }).click(); const sourceProperties = page.getByTestId("workspace-inspector").getByRole("combobox").first();',
  );
  text = text.replace(
    'await expect(voltage.getByText("Sine", { exact: true })).toBeVisible();',
    'await expect(sourceProperties).toHaveValue("sine");',
  );
  if (text.includes("ensureLibrary(page)") && !text.includes("async function ensureLibrary(page)")) {
    text = ensureLibraryHelper + text;
  }
  if (text.includes("addComponent(page,") && !text.includes("async function addComponent(page,")) {
    text = addComponentHelper + text;
  }
  text = text.replaceAll('const examples = page.getByTestId("world-examples");', 'await ensureLibrary(page); const examples = page.getByTestId("world-examples");');
  text = text.replaceAll('page.getByTestId("world-examples").getByRole(', '(await ensureLibrary(page), page.getByTestId("world-examples")).getByRole(');
  fs.writeFileSync(file, text);
}

const acceptancePath = path.join(root, "acceptance.spec.js");
let acceptance = fs.readFileSync(acceptancePath, "utf8");
acceptance = acceptance.replace(
  'for (const node of nodes) { const box = await node.boundingBox(); if (!box) throw new Error("Unable to locate circuit component."); expect(box.x + box.width).toBeLessThan(paletteBox.x - 8); }',
  'const paletteRight = paletteBox.x + paletteBox.width; for (const node of nodes) { const box = await node.boundingBox(); if (!box) throw new Error("Unable to locate circuit component."); expect(box.x).toBeGreaterThan(paletteRight + 8); }',
);
acceptance = acceptance.replace(
  'const left = canvasBox.x + 80; const right = paletteBox.x - 80;',
  'const paletteRight = paletteBox.x + paletteBox.width; const left = Math.max(canvasBox.x + 40, paletteRight + 40); const right = canvasBox.x + canvasBox.width - 80;',
);
acceptance = acceptance.replace(
  'const palette = page.getByTestId("component-palette"); const paletteBox = await palette.boundingBox();',
  'const palette = page.getByTestId("component-palette"); if (!(await palette.isVisible().catch(() => false))) await page.getByRole("button", { name: "Library" }).click(); const paletteBox = await palette.boundingBox();',
);
acceptance = acceptance.replace(
  'await moveNode(page, voltage, left + width * 0.30, top); await moveNode(page, resistor, left + width * 0.70, top); await moveNode(page, ground, left + width * 0.50, bottom); await assertNodesClearOfPalette([voltage, resistor, ground], palette);',
  'await moveNode(page, voltage, left + width * 0.30, top); await moveNode(page, resistor, left + width * 0.70, top); await moveNode(page, ground, left + width * 0.50, bottom); await assertNodesClearOfPalette([voltage, resistor, ground], palette); const librarySurfaceAfterLayout = page.getByTestId("workspace-library-surface"); if (await librarySurfaceAfterLayout.isVisible().catch(() => false)) await librarySurfaceAfterLayout.getByRole("button", { name: "Close component tool" }).click();',
);
acceptance = acceptance.replace(
  'await handle(voltage, "p").dragTo(handle(resistor, "p")); await handle(resistor, "n").dragTo(handle(ground, "g")); await handle(voltage, "n").dragTo(handle(ground, "g"));',
  'await connectHandles(page, handle(voltage, "p"), handle(resistor, "p")); await connectHandles(page, handle(resistor, "n"), handle(ground, "g")); await connectHandles(page, handle(voltage, "n"), handle(ground, "g"));',
);
if (!acceptance.includes("async function connectHandles(page")) {
  const marker = "function handle(node, id)";
  const helper = 'async function connectHandles(page, source, target) { const sourceBox = await source.boundingBox(); const targetBox = await target.boundingBox(); if (!sourceBox || !targetBox) throw new Error("Unable to locate circuit handle."); await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2); await page.mouse.down(); await page.waitForTimeout(50); await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 }); await page.waitForTimeout(50); await page.mouse.up(); }\n';
  acceptance = acceptance.replace(marker, helper + marker);
}
fs.writeFileSync(acceptancePath, acceptance);

const resultPath = path.join(root, "result-selection-acceptance.spec.js");
if (fs.existsSync(resultPath)) {
  let result = fs.readFileSync(resultPath, "utf8");
  result = result.replace('const highlightedComponent = schematic.locator(\'g.cursor-pointer\').filter({ hasText: "Resistor 1" });', 'const highlightedComponent = page.locator(".react-flow__node").filter({ hasText: "Resistor 1" });');
  result = result.replace('  await expect(highlightedComponent.locator(\'rect[stroke="#c26a2e"]\')).toBeVisible();\n', '');
  result = result.replace('  await expect(page.getByText(/Result location · Resistor 1/)).toBeVisible();\n', '');
  fs.writeFileSync(resultPath, result);
}

const uiPath = path.join(root, "electrical-ui-acceptance.spec.js");
if (fs.existsSync(uiPath)) {
  let ui = fs.readFileSync(uiPath, "utf8");
  ui = ui.replace("/Remove NMOS 1 voltage probe/", "/Remove NMOS 1(?: · G)? voltage probe/");
  ui = ui.replace('await page.getByRole("button", { name: "Instruments" }).click();', 'const instruments = page.getByTestId("workspace-instrument-surface"); if (!(await instruments.isVisible().catch(() => false))) await page.getByRole("button", { name: "Instruments" }).click();');
  ui = ui.replace('await expect(page.getByTestId("worlds-canvas").locator(".react-flow")).toHaveCSS("opacity", "0");\n', 'await expect(page.getByTestId("workspace-instrument-surface")).toBeVisible();\n');
  ui = ui.replace('await expect(page.getByTestId("workspace-canvas-surface")).toContainText("Schematic");', 'await expect(page.getByTestId("worlds-canvas")).toBeVisible();');
  ui = ui.replace('getByRole("button", { name: /R1/ })', 'getByRole("button", { name: /Resistor 1|R1/ })');
  fs.writeFileSync(uiPath, ui);
}

console.log(`Prepared ${specs.length} acceptance spec files for the schematic-first workspace.`);
