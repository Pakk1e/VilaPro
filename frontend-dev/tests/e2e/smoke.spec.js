import { test, expect } from "@playwright/test";

function installBrowserErrorChecks(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
        if (message.type() === "error") {
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

test.describe("Worlds DEV browser smoke", () => {
    test("login page renders and is usable", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await page.goto("/login", { waitUntil: "networkidle" });

        await expect(
            page.getByRole("heading", { name: "Sign in" })
        ).toBeVisible();
        await expect(page.getByLabel("Email")).toBeVisible();
        await expect(page.getByLabel("Password")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign in" })
        ).toBeEnabled();
        await expect(
            page.getByRole("button", { name: "Create account" })
        ).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "login-page");
        await assertNoBrowserErrors(errors);
    });

    test("registration navigation works", async ({ page }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await page.goto("/login", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Create account" }).click();

        await expect(page).toHaveURL(/\/register$/);
        await expect(
            page.getByRole("heading", { name: /create account/i })
        ).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "register-page");
        await assertNoBrowserErrors(errors);
    });

    test("protected Worlds route redirects unauthenticated users", async ({
        page,
    }, testInfo) => {
        const errors = installBrowserErrorChecks(page);

        await page.goto("/worlds", { waitUntil: "networkidle" });

        await expect(page).toHaveURL(/\/login$/);
        await expect(
            page.getByRole("heading", { name: "Sign in" })
        ).toBeVisible();

        await saveAuditScreenshot(page, testInfo, "worlds-auth-redirect");
        await assertNoBrowserErrors(errors);
    });
});
