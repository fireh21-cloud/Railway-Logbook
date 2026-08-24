import { chromium } from "playwright";

const BASE = "http://localhost:8842";
const errors = [];
const consoleLogs = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => {
  consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));

async function shot(name) {
  await page.screenshot({ path: `scripts/shots/${name}.png` });
}

await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Onboarding may show first
const onboardingVisible = await page.locator("#onboarding-overlay:not(.hidden)").count();
if (onboardingVisible) {
  await page.fill("#onboarding-name-input", "Test Pilot");
  await page.click("#onboarding-save-btn");
  await page.waitForTimeout(300);
}

await shot("01-duty-list-empty");
const emptyStateText = await page.locator(".empty-state").first().textContent().catch(() => null);
console.log("Empty state text:", emptyStateText);

// Click Locomotives tab
await page.click('[data-tab="locomotives"]');
await page.waitForTimeout(300);
await shot("02-locomotives-empty");

// Add a locomotive
await page.click(".fab");
await page.waitForTimeout(300);
await shot("03-locomotive-form");
const locoNumberInput = page.locator(".form-section input[type=text]").first();
await locoNumberInput.fill("22228");
await page.locator(".form-section input[type=text]").nth(1).fill("WAP-4");
await page.locator(".form-section input[type=text]").nth(2).fill("JHANSI");
await page.waitForTimeout(600); // let autosave debounce fire
await page.click(".sheet-header .icon-btn"); // back
await page.waitForTimeout(300);
await shot("04-locomotives-list-with-one");
const locoRowText = await page.locator(".list-row-title").first().textContent().catch(() => null);
console.log("Locomotive row title:", locoRowText);

// Settings tab
await page.click('[data-tab="settings"]');
await page.waitForTimeout(300);
await shot("05-settings");

// Duty Log tab, add entry
await page.click('[data-tab="duty"]');
await page.waitForTimeout(300);
await page.click(".fab");
await page.waitForTimeout(400);
await shot("06-duty-form-empty");

// Fill train number and name
const tripInputs = page.locator(".form-section").nth(0).locator("input[type=text]");
await tripInputs.nth(0).fill("12055");
await tripInputs.nth(1).fill("Dehradun Jan Shatabdi Express");

// select the locomotive we created
await page.locator(".form-section select").first().selectOption({ label: "22228 · WAP-4" }).catch(async (e) => {
  const opts = await page.locator(".form-section select").first().locator("option").allTextContents();
  console.log("Locomotive select options:", opts);
});

// Tap the first "Tap to set" time field
const tapToSetBtn = page.locator("button:has-text('Tap to set')").first();
await tapToSetBtn.click();
await page.waitForTimeout(200);
await shot("07-duty-form-filled");

const timeInputValue = await page.locator(".time-row input[type=time]").first().inputValue().catch(() => null);
console.log("First timeline field value after tap:", timeInputValue);

await page.waitForTimeout(600); // debounce
await page.click(".sheet-header .icon-btn"); // back
await page.waitForTimeout(400);
await shot("08-duty-list-with-one");

const dutyRowTitle = await page.locator(".list-row-title").first().textContent().catch(() => null);
console.log("Duty entry row title after save+back:", dutyRowTitle);

// Reopen the entry to confirm persistence
await page.click(".list-row");
await page.waitForTimeout(400);
const reopenedTrainNumber = await page.locator(".form-section input[type=text]").first().inputValue().catch(() => null);
console.log("Reopened train number:", reopenedTrainNumber);
const reopenedTimeValue = await page.locator(".time-row input[type=time]").first().inputValue().catch(() => null);
console.log("Reopened first timeline value:", reopenedTimeValue);
await shot("09-duty-form-reopened");

console.log("\n--- CONSOLE ERRORS ---");
console.log(errors.length ? errors.join("\n") : "(none)");
console.log("\n--- ALL CONSOLE LOGS ---");
console.log(consoleLogs.join("\n"));

await browser.close();
process.exit(errors.length ? 1 : 0);
