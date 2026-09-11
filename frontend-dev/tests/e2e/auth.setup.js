import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const E2E_EMAIL = globalThis.process?.env.WORLDS_E2E_EMAIL;
const E2E_PASSWORD = globalThis.process?.env.WORLDS_E2E_PASSWORD;
const BASE_URL =
  globalThis.process?.env.PLAYWRIGHT_TEST_BASE_URL ||
  "https://worlds-dev.vadovsky-tech.com";
const STORAGE_STATE = path.resolve("playwright/.auth/user.json");

export default async function globalSetup() {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error("WORLDS_E2E_EMAIL and WORLDS_E2E_PASSWORD must be configured.");
  }

  await fs.mkdir(path.dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/hub$/);
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
