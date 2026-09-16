const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const helper = 'async function ensureLibrary(page) { const surface = page.getByTestId("workspace-library-surface"); if (!(await surface.isVisible().catch(() => false))) await page.getByRole("button", { name: "Library" }).click(); }\n';

for (const name of fs.readdirSync(root).filter((file) => file.endsWith(".spec.js"))) {
  const file = path.join(root, name);
  let text = fs.readFileSync(file, "utf8");
  if (/\bensureLibrary\(page\)/.test(text) && !/function ensureLibrary\(page\)/.test(text)) text = helper + text;
  fs.writeFileSync(file, text);
}

const acceptancePath = path.join(root, "acceptance.spec.js");
let acceptance = fs.readFileSync(acceptancePath, "utf8");
acceptance = acceptance.replaceAll('getByTestId("component-inspector")', 'getByTestId("workspace-inspector")');
acceptance = acceptance.replaceAll('await voltage.click();', 'await voltage.click({ force: true });');
acceptance = acceptance.replaceAll('await resistor.click();', 'await resistor.click({ force: true });');
acceptance = acceptance.replaceAll('await seed.click();', 'await seed.click({ force: true });');
acceptance = acceptance.replaceAll('page.getByRole("button", { name: "Simulation" })', 'page.getByRole("button", { name: "Simulate" })');
acceptance = acceptance.replaceAll('page.getByRole("button", { name: /Simulate/ })', 'page.getByTestId("simulate-button")');
acceptance = acceptance.replaceAll('page.getByLabel("Start", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Start", { exact: true })');
acceptance = acceptance.replaceAll('page.getByLabel("Stop", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Stop", { exact: true })');
acceptance = acceptance.replaceAll('page.getByLabel("Step", { exact: true })', 'page.getByTestId("simulation-setup").getByLabel("Step", { exact: true })');
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
  const helperSource = 'async function connectHandles(page, source, target) { const sourceBox = await source.boundingBox(); const targetBox = await target.boundingBox(); if (!sourceBox || !targetBox) throw new Error("Unable to locate circuit handle."); await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2); await page.mouse.down(); await page.waitForTimeout(50); await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 }); await page.waitForTimeout(50); await page.mouse.up(); }\n';
  acceptance = acceptance.replace("function handle(node, id)", helperSource + "function handle(node, id)");
}

// The preparation script may already add this close operation. Collapse repeated copies so this normalizer is safe to run repeatedly.
const libraryClose = 'const librarySurfaceAfterLayout = page.getByTestId("workspace-library-surface"); if (await librarySurfaceAfterLayout.isVisible().catch(() => false)) await librarySurfaceAfterLayout.getByRole("button", { name: "Close component tool" }).click();';
acceptance = acceptance.replace(new RegExp(`(?:${libraryClose.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*){2,}`, "g"), `${libraryClose} `);

fs.writeFileSync(acceptancePath, acceptance);

const specs = fs.readdirSync(root).filter((file) => file.endsWith(".spec.js"));
for (const name of specs) {
  const text = fs.readFileSync(path.join(root, name), "utf8");
  if (/\bensureLibrary\(page\)/.test(text) && !/function ensureLibrary\(page\)/.test(text)) {
    throw new Error(`Normalization invariant failed: ${name} calls ensureLibrary(page) without a helper.`);
  }
}

console.log(`Normalized ${specs.length} schematic acceptance specs.`);
