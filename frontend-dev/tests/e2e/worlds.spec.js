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

async function createSeriesCircuit(page) {
    const canvas = page.locator(".react-flow");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Unable to locate Worlds canvas.");

    // Give the circuit more usable canvas area. The production canvas already
    // exposes ReactFlow controls, so use the real zoom control rather than
    // changing application behavior just for the E2E test.
    const zoomOut = page.locator(".react-flow__controls-zoomout");
    await expect(zoomOut).toBeVisible();
    await zoomOut.click();
    await zoomOut.click();

    const voltage = await addComponent(page, "Voltage Source", "Voltage Source 1");
    const resistor = await addComponent(page, "Resistor", "Resistor 1");
    const ground = await addComponent(page, "Ground", "Ground 1");

    // Keep all three nodes comfortably inside the canvas and separated in both
    // axes. This prevents a node body from intercepting a handle click.
    const centerX = canvasBox.x + canvasBox.width * 0.50;
    await moveNode(page, voltage, centerX, canvasBox.y + canvasBox.height * 0.22);
    await moveNode(page, resistor, centerX, canvasBox.y + canvasBox.height * 0.50);
    await moveNode(page, ground, centerX, canvasBox.y + canvasBox.height * 0.78);

    await nodeHandle(voltage, "p").dragTo(nodeHandle(resistor, "p"));
    await nodeHandle(resistor, "n").dragTo(nodeHandle(ground, "g"));
    await nodeHandle(voltage, "n").dragTo(nodeHandle(ground, "g"));

    await expect(page.locator(".react-flow__edge")).toHaveCount(3);
    return { voltage, resistor, ground };
}

test.describe("Worlds DEV authenticated audit", () => {
    test("authenticated user can enter Worlds and inspect the design workspace", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });

        await expect(page.getByText("VilaPro World")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Circuit Design" })
        ).toHaveAttribute("aria-current", "page");
        await expect(page.getByText("Components", { exact: true })).toBeVisible();
        await expect(page.getByText("Palette", { exact: true })).toBeVisible();
        await expect(
            page.getByText("Add a component to get started.", { exact: true })
        ).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-design-empty");
        await assertNoBrowserErrors(errors);
    });

    test("component placement, selection and properties work", async ({
        page,
    }, testInfo) => {
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

    test("simulation workspace exposes analysis setup and result area", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Voltage Source" }).click();
        await page.getByRole("button", { name: "Resistor" }).click();
        await page.getByRole("button", { name: "Ground" }).click();

        await page.getByRole("button", { name: "Simulation" }).click();

        await expect(
            page.getByRole("button", { name: "Simulation" })
        ).toHaveAttribute("aria-current", "page");
        await expect(page.getByText("Simulation Setup")).toBeVisible();
        await expect(page.getByLabel("Analysis")).toHaveValue("dc_operating_point");
        await expect(page.getByText("No simulation results yet")).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-simulation-setup");
        await assertNoBrowserErrors(errors);
    });

    test("simulation setup validation is visible for an invalid DC sweep", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Voltage Source" }).click();
        await page.getByRole("button", { name: "Simulation" }).click();

        await page.getByLabel("Analysis").selectOption("dc_sweep");

        await expect(
            page.locator('[role="alert"]').filter({
                hasText: /^Select a voltage or current source to sweep\.$/,
            })
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Simulate" })
        ).toBeDisabled();

        await saveAuditScreenshot(page, testInfo, "worlds-simulation-invalid-sweep");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit can be drawn, connected and rendered as a schematic", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);

        await expect(page.locator(".react-flow__edge")).toHaveCount(3);
        await page.getByRole("button", { name: "Simulation" }).click();

        await expect(page.getByRole("img", { name: "Circuit schematic preview" })).toBeVisible();
        await expect(page.getByText("3 components", { exact: true })).toBeVisible();
        await expect(page.getByText("Voltage Source 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText("Resistor 1", { exact: true }).last()).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-real-circuit-schematic");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit runs DC operating point and exposes numerical results", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await page.getByRole("button", { name: "Simulation" }).click();

        const simulate = page.getByRole("button", { name: "Simulate" });
        await expect(simulate).toBeEnabled();
        await simulate.click();

        await expect(page.getByRole("region", { name: "Simulation results" })).toBeVisible({ timeout: 15000 });
        await expect(simulate).toHaveText("Simulate");
        await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
        await expect(page.getByText("Voltage Source 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText("Resistor 1", { exact: true }).last()).toBeVisible();
        await expect(page.getByText(/120\.?0? mA/).first()).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-dc-operating-point-results");
        await assertNoBrowserErrors(errors);
    });

    test("real circuit runs a DC sweep and produces multiple sweep points", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await signIn(page);
        await page.goto("/worlds", { waitUntil: "networkidle" });
        await createSeriesCircuit(page);
        await page.getByRole("button", { name: "Simulation" }).click();

        await page.getByLabel("Analysis").selectOption("dc_sweep");
        await page.getByLabel("Sweep source").selectOption({ label: /Voltage Source 1/ });

        const sweepInputs = page.locator('input[type="number"]');
        await sweepInputs.nth(0).fill("0");
        await sweepInputs.nth(1).fill("12");
        await sweepInputs.nth(2).fill("3");

        await expect(
            page.locator('[role="alert"]').filter({ hasText: /^Select a voltage or current source to sweep\.$/ })
        ).toHaveCount(0);

        const simulate = page.getByRole("button", { name: "Simulate" });
        await expect(simulate).toBeEnabled();
        await simulate.click();

        await expect(page.getByRole("region", { name: "Simulation results" })).toBeVisible({ timeout: 15000 });
        await expect(simulate).toHaveText("Simulate");
        await expect(page.getByText("Circuit Summary", { exact: true })).toBeVisible();
        await expect(page.getByText(/Values shown at the last valid sweep point\./)).toBeVisible();
        await expect(page.getByRole("img", { name: /result plot/i })).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-dc-sweep-results");
        await assertNoBrowserErrors(errors);
    });
});
