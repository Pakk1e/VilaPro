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
            page.getByRole("alert").filter({ hasText: "Select a voltage or current source to sweep." })
        ).toBeVisible();
        await expect(page.getByText("Select a voltage or current source to sweep.", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Simulate" })
        ).toBeDisabled();

        await saveAuditScreenshot(page, testInfo, "worlds-simulation-invalid-sweep");
        await assertNoBrowserErrors(errors);
    });
});
