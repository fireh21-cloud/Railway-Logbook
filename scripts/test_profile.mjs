import { chromium } from "playwright";

const BASE = "http://localhost:8080";
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const onboardingCount = await page.locator("#onboarding-overlay").count();
console.log("onboarding-overlay elements in DOM:", onboardingCount);

await page.click('[data-tab="settings"]');
await page.waitForTimeout(300);
const nameValue = await page.locator(".form-section input[type=text]").first().inputValue();
console.log("Pilot name in Settings:", nameValue);

console.log("--- ERRORS ---");
console.log(errors.length ? errors.join("\n") : "(none)");
await browser.close();
process.exit(errors.length ? 1 : 0);
