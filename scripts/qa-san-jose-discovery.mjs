/**
 * Headless QA: San Jose sandbox discovery flow.
 * Run: node scripts/qa-san-jose-discovery.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });

  // Search drill-in to San Jose metro
  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
  await searchInput.waitFor({ timeout: 15_000 });
  await searchInput.fill("San Jose");
  await page.waitForTimeout(800);
  const result = page.locator(".search-bar__result").filter({ hasText: /San Jose/i }).first();
  await result.waitFor({ timeout: 10_000 });
  await result.click();
  await page.waitForTimeout(2500);

  // Find neighborhoods
  const discoverBtn = page.locator(".top-bar__discover-btn");
  await discoverBtn.waitFor({ timeout: 10_000 });
  await discoverBtn.click();
  await page.waitForTimeout(4000);

  const noMatch = page.getByText(/no neighborhoods match/i);
  if (await noMatch.isVisible().catch(() => false)) {
    throw new Error("Discovery returned 0 matches for San Jose");
  }

  const tourChrome = page.locator(".cinematic--tour, .analytics-overlay, .discovery-analytics");
  const tourVisible = await tourChrome.first().isVisible().catch(() => false);
  const zipHighlight = await page.locator(".context-chip, .zip-detail").first().isVisible().catch(() => false);
  if (!tourVisible && !zipHighlight) {
    throw new Error("Discovery tour chrome did not appear");
  }

  await page.waitForTimeout(6000);

  if (errors.length > 0) {
    console.warn("Non-fatal errors:", errors.slice(0, 5));
  }

  console.log("PASS: San Jose search drill-in + discovery tour started without crash");
  await browser.close();
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
