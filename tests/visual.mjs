import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("test-results", { recursive: true });
const baseURL = process.env.ORBIT_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 320, height: 780 },
  reducedMotion: "reduce",
});
const checks = [];
await page.goto(baseURL);
await page.getByRole("heading", { name: "С возвращением" }).waitFor();
for (const mode of ["login", "register"]) {
  if (mode === "register")
    await page
      .getByRole("button", { name: "Регистрация", exact: true })
      .click();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  checks.push(`320px ${mode}: no horizontal overflow`);
  assert.equal(
    await page
      .locator(".liquid-fill")
      .evaluate((el) => getComputedStyle(el, "::before").animationName),
    "none",
  );
  checks.push(`${mode}: reduced motion respected`);
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(baseURL + "/?demo=1");
await page.getByRole("heading", { name: "Куда уходят деньги" }).waitFor();
assert.equal(
  await page
    .locator(".breadcrumb>.orbit-logo")
    .evaluate((el) => getComputedStyle(el).color),
  "rgb(244, 244, 255)",
);
checks.push("Desktop logo has readable foreground");
assert(await page.locator(".breadcrumb .orbit-logo svg").isVisible());
checks.push("Desktop logo includes star");
await writeFile(
  "test-results/visual-verification-v3.json",
  JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
);
await browser.close();
console.log(`${checks.length} visual checks passed`);
