import { chromium } from "playwright";

const BASE = "http://localhost:8842";
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const onboardingVisible = await page.locator("#onboarding-overlay:not(.hidden)").count();
if (onboardingVisible) {
  await page.fill("#onboarding-name-input", "Test Pilot");
  await page.click("#onboarding-save-btn");
  await page.waitForTimeout(300);
}

// this is a fresh browser context (separate IndexedDB), so create an entry first
await page.click('[data-tab="duty"]');
await page.waitForTimeout(300);
await page.click(".fab");
await page.waitForTimeout(300);
await page.locator(".form-section").nth(0).locator("input[type=text]").nth(0).fill("12055");
await page.locator(".form-section").nth(0).locator("input[type=text]").nth(1).fill("Dehradun Jan Shatabdi Express");
await page.locator(".time-row button:has-text('Tap to set')").first().click();
await page.waitForTimeout(600);
await page.locator(".sheet-header .icon-btn").nth(1).click(); // export button
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/10-export-card.png" });

const canvasSize = await page.locator(".duty-card-canvas-wrap canvas").evaluate((c) => ({ w: c.width, h: c.height })).catch(() => null);
console.log("Canvas size:", canvasSize);

console.log("--- ERRORS ---");
console.log(errors.length ? errors.join("\n") : "(none)");
await browser.close();
process.exit(errors.length ? 1 : 0);
