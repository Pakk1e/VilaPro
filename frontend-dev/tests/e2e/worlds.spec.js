import { test, expect } from "@playwright/test";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;
const EXPECTED_AUTH_401 =
    "Failed to load resource: the server responded with a status of 401 ()";

function installBrowserErrorChecks(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
        if (message.type() === "error" && message.text() !== EXPECTED_AUTH_401) {
            consoleErrors.push(message.text());
        }
    });

    page.on("pageerror", (error) => {
        pageErrors.push(error.message);
    });

    return { consoleErrors, pageErrors };
}

async function saveAuditScreenshot(page, testInfo, name) {
    await page.screenshot({
        path: testInfo.outputPath(`${name}.png`),
        fullPage: true,
        animations: "disabled",
    });
}

async function assertNoBrowserErrors(errorState) {
    expect(errorState.consoleErrors, "browser console errors").toEqual([]);
    expect(errorState.pageErrors, "uncaught page errors").toEqual([]);
}

async function signIn(page) {
    if (!E2E_EMAIL || !E2E_PASSWORD) {
        throw new Error(
            "WORLDS_E2E_EMAIL and WORLDS_E2E_PASSWORD must be configured for authenticated Worlds E2E tests."
        );
    }

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

async function zoomOutCompletely(page) {
    const zoomOut = page.locator(".react-flow__controls-zoomout");
    await expect(zoomOut).toBeVisible();

    for (let i = 0; i < 20; i += 1) {
        if (await zoomOut.isDisabled()) break;
        await zoomOut.click();
    }
}

async function createSeriesCircuit(page) {
    const canvas = page.locator(".react-flow");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Unable to locate Worlds canvas.");

    const initialComponent = await addComponent(page, "Resistor", "Resistor 1");
    await zoomOutCompletely(page);

    await initialComponent.click();
    await page.keyboard.press("Delete");
    await expect(initialComponent).toHaveCount(0);

    const voltage = await addComponent(page, "Voltage Source", "Voltage Source 1");
    const resistor = await addComponent(page, "Resistor", "Resistor 1");
    const ground = await addComponent(page, "Ground", "Ground 1");

    const palette = page.locator("aside").filter({ hasText: "Palette" }).first();
    await expect(palette).toBeVisible();
    const paletteBox = await palette.boundingBox();
    if (!paletteBox) throw new Error("Unable to locate Worlds component palette.");

    const usableLeft = canvasBox.x + 80;
    const usableRight = paletteBox.x - 80;
    if (usableRight <= usableLeft + 300) {
        throw new Error("Worlds canvas does not have enough unobstructed space for the E2E circuit.");
    }

    const usableWidth = usableRight - usableLeft;
    const leftX = usableLeft + usableWidth * 0.30;
    const rightX = usableLeft + usableWidth * 0.70;
    const centerX = usableLeft + usableWidth * 0.50;
    const topY = canvasBox.y + canvasBox.height * 0.34;
    const groundY = canvasBox.y + canvasBox.height * 0.68;

    await moveNode(page, voltage, leftX, topY);
    await moveNode(page, resistor, rightX, topY);
    await moveNode(page, ground, centerX, groundY);

    await nodeHandle(voltage, "p").dragTo(nodeHandle(resistor, "p"));
    await nodeHandle(resistor, "n").dragTo(nodeHandle(ground, "g"));
    await nodeHandle(voltage, "n").dragTo(nodeHandle(ground, "g"));

    await expect(page.locator(".react-flow__edge")).toHaveCount(3);
    return { voltage, resistor, ground };
}

async function expectSimulationResults(page) {
    const results = page.getByRole("region", { name: "Simulation results" });
    const simulationError = page.locator('[role="alert"]').filter({ hasText: "Simulation error" }).first();

    const outcome = await expect
        .poll(
            async () => {
                if (await results.isVisible().catch(() => false)) return "results";
                if (await simulationError.isVisible().catch(() => false)) return "error";
                return "pending";
            },
            {
                timeout: 15000,
                intervals: [250, 500, 1000],
                message: "Timed out waiting for simulation results or a simulation error.",
            }
        )
        .not.toBe("pending");

    if (outcome === "error") {
        throw new Error(`Simulation returned an error: ${await simulationError.innerText()}`);
    }

    return results;
}

test.describe("Worlds DEV authenticated audit", () => {
    test("authenticated user can enter Worlds and inspect the design workspace", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await expect(page.getByText("VilaPro World")).toBeVisible();
        await expect(page.getByRole("button", { name: "Circuit Design" })).toHaveAttribute("aria-current", "page");
        await expect(page.getByText("Components", { exact: true })).toBeVisible();
        await expect(page.getByText("Palette", { exact: true })).toBeVisible();
        await expect(page.getByText("Add a component to get started.", { exact: true })).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-design-empty");
        await assertNoBrowserErrors(errors);
    });

    test("component placement, selection and properties work", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: /Resistor.*Add to canvas/i }).click();
        await expect(page.getByText("Resistor 1").first()).toBeVisible();
        await expect(page.getByText("Selected component")).toBeVisible();
        await expect(page.getByText("Resistance", { exact: true }).last()).toBeVisible();
        await expect(page.getByText("100 Ω", { exact: true }).first()).toBeVisible();
        const resistanceInput = page.locator('input[type="number"]').first();
        await expect(resistanceInput).toHaveValue("100");
        await resistanceInput.fill("220");
        await expect(resistanceInput).toHaveValue("220");
        await expect(page.getByText("220 Ω", { exact: true }).first()).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-resistor-inspector");
        await assertNoBrowserErrors(errors);
    });

    test("simulation workspace exposes analysis setup and result area", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Voltage Source" }).click();
        await page.getByRole("button", { name: "Resistor" }).click();
        await page.getByRole("button", { name: "Ground" }).click();
        await page.getByRole("button", { name: "Simulation" }).click();
        await expect(page.getByRole("button", { name: "Simulation" })).toHaveAttribute("aria-current", "page");
        await expect(page.getByText("Simulation Setup")).toBeVisible();
        await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
        await expect(page.getByText("No simulation results yet")).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-simulation-setup");
        await assertNoBrowserErrors(errors);
    });

    test("simulation setup validation is visible for an invalid DC sweep", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Voltage Source" }).click();
        await page.getByRole("button", { name: "Simulation" }).click();
        await page.getByLabel("Analysis").selectOption("dc_sweep");
        await expect(page.locator('[role="alert"]').filter({ hasText: /^Select a voltage or current source to sweep\.$/ })).toBeVisible();
        await expect(page.getByRole("button", { name: "Simulate" })).toBeDisabled();
        await saveAuditScreenshot(page, testInfo, "worlds-simulation-invalid-sweep");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit can be drawn, connected and rendered as a schematic", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await expect(page.locator(".react-flow__edge")).toHaveCount(3);
        await page.getByRole("button", { name: "Simulation" }).click();
        await expect(page.getByRole("img", { name: "Circuit schematic preview" })).toBeVisible();
        await expect(page.getByText("2 components", { exact: true })).toBeVisible();
        await expect(page.getByText("Voltage Source 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText("Resistor 1", { exact: true }).last()).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-real-circuit-schematic");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit runs DC operating point and exposes numerical results", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await page.getByRole("button", { name: "Simulation" }).click();
        const simulate = page.getByRole("button", { name: "Simulate" });
        await expect(simulate).toBeEnabled();
        await simulate.click();
        await expectSimulationResults(page);
        await expect(simulate).toHaveText("Simulate");
        await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
        await expect(page.getByText("Voltage Source 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText("Resistor 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText(/120\.?0? mA/).first()).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-dc-operating-point-results");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit runs static AC and exposes phasor results", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await page.getByRole("button", { name: "Simulation" }).click();
        await page.getByLabel("Analysis").selectOption("ac");
        await expect(page.getByText("Static AC is a single-frequency operating point")).toBeVisible();
        const simulate = page.getByRole("button", { name: "Simulate" });
        await expect(simulate).toBeEnabled();
        await simulate.click();
        const results = page.getByRole("region", { name: "AC phasor results" });
        await expect(results).toBeVisible({ timeout: 15000 });
        await expect(results.getByText("AC Phasors", { exact: true })).toBeVisible();
        await expect(results.getByText(/1,?000(?:\.0+)?/).first()).toBeVisible();
        await expect(results.getByText("Phasor values", { exact: true })).toBeVisible();
        await expect(page.locator('[role="alert"]').filter({ hasText: "Unsupported simulation result from analysis 'ac'" })).toHaveCount(0);
        await saveAuditScreenshot(page, testInfo, "worlds-static-ac-results");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit runs a DC sweep and produces multiple sweep points", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);
        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await page.getByRole("button", { name: "Simulation" }).click();
        await page.getByLabel("Analysis").selectOption("dc_sweep");
        await page.getByLabel("Sweep source").selectOption({ label: "Voltage Source 1 (Voltage Source)" });
        const sweepInputs = page.locator('input[type="number"]');
        await sweepInputs.nth(0).fill("0");
        await sweepInputs.nth(1).fill("12");
        await sweepInputs.nth(2).fill("3");
        await expect(page.locator('[role="alert"]').filter({ hasText: /^Select a voltage or current source to sweep\.$/ })).toHaveCount(0);
        const simulate = page.getByRole("button", { name: "Simulate" });
        await expect(simulate).toBeEnabled();
        await simulate.click();
        await expectSimulationResults(page);
        await expect(simulate).toHaveText("Simulate");
        await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
        await expect(page.getByText(/Values shown at the last valid sweep point\./).first()).toBeVisible();
        await expect(page.getByRole("img", { name: /result plot/i })).toBeVisible();
        await saveAuditScreenshot(page, testInfo, "worlds-dc-sweep-results");
        await assertNoBrowserErrors(errors);
    });
});
