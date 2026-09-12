const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const specs = fs.readdirSync(root).filter((name) => name.endsWith(".spec.js"));

for (const name of specs) {
  const file = path.join(root, name);
  let text = fs.readFileSync(file, "utf8");
  text = text.replaceAll('page.getByRole("button", { name: /Simulate/ })', 'page.getByTestId("simulate-button")');
  text = text.replaceAll('page.getByRole("button", { name: "Start Live" })', 'page.getByTestId("simulate-button")');
  if (name !== "electrical-ui-acceptance.spec.js") {
    text = text.replaceAll(
      'await page.goto("/worlds", { waitUntil: "networkidle" });',
      'await page.goto("/worlds", { waitUntil: "networkidle" }); await page.getByRole("button", { name: "Library" }).click();',
    );
  }
  fs.writeFileSync(file, text);
}

const acceptancePath = path.join(root, "acceptance.spec.js");
let acceptance = fs.readFileSync(acceptancePath, "utf8");
acceptance = acceptance.replace(
  "const left = canvasBox.x + 80; const right = paletteBox.x - 80;",
  "const paletteRight = paletteBox.x + paletteBox.width; const left = Math.max(canvasBox.x + 40, paletteRight + 40); const right = canvasBox.x + canvasBox.width - 80;",
);
acceptance = acceptance.replace(
  'for (const node of nodes) { const box = await node.boundingBox(); if (!box) throw new Error("Unable to locate circuit component."); expect(box.x + box.width).toBeLessThan(paletteBox.x - 8); }',
  'const paletteRight = paletteBox.x + paletteBox.width; for (const node of nodes) { const box = await node.boundingBox(); if (!box) throw new Error("Unable to locate circuit component."); expect(box.x).toBeGreaterThan(paletteRight + 8); }',
);
const marker = "function handle(node, id)";
if (!acceptance.includes("async function connectHandles(page")) {
  const helper = `async function connectHandles(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Unable to locate circuit handle.");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.waitForTimeout(50);
  await page.mouse.up();
}
`;
  acceptance = acceptance.replace(marker, helper + marker);
}
acceptance = acceptance.replaceAll(
  'await handle(voltage, "p").dragTo(handle(resistor, "p")); await handle(resistor, "n").dragTo(handle(ground, "g")); await handle(voltage, "n").dragTo(handle(ground, "g"));',
  'await connectHandles(page, handle(voltage, "p"), handle(resistor, "p")); await connectHandles(page, handle(resistor, "n"), handle(ground, "g")); await connectHandles(page, handle(voltage, "n"), handle(ground, "g"));',
);
fs.writeFileSync(acceptancePath, acceptance);

const uiPath = path.join(root, "electrical-ui-acceptance.spec.js");
if (fs.existsSync(uiPath)) {
  let ui = fs.readFileSync(uiPath, "utf8");
  ui = ui.replace("/Remove NMOS 1 voltage probe/", "/Remove NMOS 1(?: · G)? voltage probe/");
  fs.writeFileSync(uiPath, ui);
}

// Keep this adapter intentionally test-only: production workspace remains canvas-first.
console.log(`Prepared ${specs.length} acceptance spec files for the schematic-first workspace.`);
