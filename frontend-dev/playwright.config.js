import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    outputDir: "../testscreenshots",
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    fullyParallel: false,
    workers: globalThis.process?.env.CI ? 1 : undefined,
    retries: globalThis.process?.env.CI ? 1 : 0,
    reporter: globalThis.process?.env.CI
        ? [["html", { outputFolder: "../playwright-report", open: "never" }], ["list"]]
        : "list",
    use: {
        baseURL:
            globalThis.process?.env.PLAYWRIGHT_TEST_BASE_URL ||
            "https://worlds-dev.vadovsky-tech.com",
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
        serviceWorkers: "block",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
