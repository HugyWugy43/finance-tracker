import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const checks = [],
  check = (name, value) => {
    const number = String(checks.length + 1).padStart(3, "0");
    if (!value) console.error(`[FAIL ${number}] ${name}`);
    assert(value, name);
    checks.push(name);
    console.log(`[PASS ${number}] ${name}`);
  };
await mkdir("test-results", { recursive: true });
const baseURL = process.env.ORBIT_URL || "http://127.0.0.1:5173";
console.log(`Usability tests: ${baseURL}\n`);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await page.clock.setFixedTime(new Date("2026-10-11T09:00:00Z"));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const entries = [
    ["2026-10-11", 100000, "home"],
    ["2026-10-11", 1000, "other"],
    ["2026-10-10", 200000, "home"],
    ["2026-10-05", 300000, "home"],
    ["2026-10-04", 400000, "home"],
    ["2026-09-30", 500000, "home"],
  ].map(([date, amount, category], i) => ({
    id: String(i),
    type: "expense",
    title: `Расход ${i}`,
    account: "Основной счёт",
    date,
    amount,
    category,
  }));
  await page.route("**/api/me", (r) =>
    r.fulfill({
      json: {
        user: {
          id: "qa",
          fullName: "Мария",
          nickname: "qa",
          email: "qa@example.test",
          budget: 2000000,
        },
      },
    }),
  );
  await page.route("**/api/transactions", (r) =>
    r.fulfill({ json: { transactions: entries } }),
  );
  await page.goto(baseURL);
  await page.getByRole("heading", { name: "Куда уходят деньги" }).waitFor();
  const total = () =>
    page.locator(".overview-expenses .donut-center>strong").innerText();
  const numeric = (s) => Number(s.replace(/[^\d,]/g, "").replace(",", "."));
  check("Month total", numeric(await total()) === 10010);
  await page.getByRole("button", { name: "День", exact: true }).click();
  check("Day total", numeric(await total()) === 1010);
  check(
    "Day caption",
    (await page.locator(".donut-center small").innerText()) ===
      "2 операций за день",
  );
  await page.getByRole("button", { name: "Неделя", exact: true }).click();
  check("Inclusive seven-day total", numeric(await total()) === 6010);
  await page.getByLabel("Первый день недели").fill("2026-09-27");
  check("Week crosses month boundary", numeric(await total()) === 5000);
  await page
    .locator(".overview-expenses .chart-legend button")
    .filter({ hasText: "Дом" })
    .click();
  await page.getByRole("heading", { name: "История операций" }).waitFor();
  check(
    "Category drilldown retains date range",
    (await page.locator(".operations-panel .transaction-row").count()) === 1 &&
      (await page
        .locator(".operations-panel")
        .getByText("Расход 5", { exact: true })
        .count()) === 1,
  );
  await page.getByRole("button", { name: "Показать весь месяц" }).click();
  check(
    "Date filter can be cleared",
    (await page.locator(".operations-panel .transaction-row").count()) === 4,
  );
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  for (const width of [1440, 834, 760, 730, 701, 570, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    let baseline;
    for (const name of ["Обзор", "Операции", "Аналитика", "Личный кабинет"]) {
      const button = nav.getByRole("button", { name, exact: true });
      await button.click();
      await page.evaluate(() => document.fonts.ready);
      const boxes = await nav.locator(".nav-link").evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        }),
      );
      if (!baseline) baseline = boxes;
      check(
        `${width} ${name}: navigation stays fixed`,
        boxes.flat().every((v, i) => Math.abs(v - baseline.flat()[i]) < 0.6),
      );
      check(
        `${width} ${name}: no overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (name === "Обзор") {
        check(
          `${width}: budget follows balance in DOM`,
          await page
            .locator(".overview-grid>section")
            .nth(1)
            .evaluate((n) => n.classList.contains("overview-budget")),
        );
        if (width <= 760) {
          const card = await page
            .locator(".overview-grid>section")
            .evaluateAll((ns) =>
              ns.map((n) => {
                const r = n.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
              }),
            );
          check(
            `${width}: single-column card order`,
            card.every((r, i) => !i || r.y >= card[i - 1].y + card[i - 1].h),
          );
        }
        check(
          `${width}: operation button is readable`,
          await page
            .locator(".add-operation")
            .evaluate((n) => parseFloat(getComputedStyle(n).fontSize) >= 16),
        );
        check(
          `${width}: smooth budget bar`,
          (await page.locator(".budget-progress>span").count()) === 1 &&
            (await page.locator(".budget-segments").count()) === 0,
        );
        if ([1440, 390].includes(width))
          await page.screenshot({
            path: `test-results/usability-overview-${width}.png`,
            fullPage: true,
          });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav.getByRole("button", { name: "Аналитика", exact: true }).click();
  const chart = page.locator(".trend-interactive"),
    range = page.getByRole("slider", { name: "День на графике" });
  await chart.scrollIntoViewIfNeeded();
  let box = await chart.boundingBox();
  await page.mouse.move(box.x + box.width * 0.65, box.y + 5);
  check(
    "Hover anywhere in chart selects day",
    Number(await range.inputValue()) > 1,
  );
  await page.touchscreen.tap(
    box.x + box.width * 0.25,
    box.y + box.height * 0.8,
  );
  check(
    "Touch far from line selects day",
    Number(await range.inputValue()) >= 2 &&
      Number(await range.inputValue()) <= 4,
  );
  await range.focus();
  await range.press("End");
  check("Keyboard reaches last day", (await range.inputValue()) === "11");
  await range.press("Home");
  check("Keyboard reaches first day", (await range.inputValue()) === "1");
  await page.screenshot({
    path: "test-results/usability-chart-touch.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Итог месяца", exact: true }).click();
  check(
    "Monthly total can be restored",
    (await page.locator(".trend-reading span").innerText()) ===
      "за выбранный месяц",
  );
  await page.getByRole("button", { name: "Предыдущий месяц" }).click();
  await range.fill("30");
  await page.getByRole("button", { name: "Следующий месяц" }).click();
  check(
    "Changing to shorter period resets selected day",
    (await range.inputValue()) === "1",
  );
  await nav.getByRole("button", { name: "Обзор", exact: true }).click();
  await page.getByRole("button", { name: "День", exact: true }).click();
  await page.getByLabel("Дата расходов").fill("2026-10-02");
  check(
    "Empty day preserves chart layout with zero total",
    numeric(await total()) === 0 &&
      (await page
        .locator(".overview-expenses .chart-legend button")
        .count()) === 6,
  );
  await page.unroute("**/api/me");
  await page.route("**/api/me", (r) =>
    r.fulfill({ status: 401, json: { error: "Unauthorized" } }),
  );
  await page.goto(baseURL + "/?view=profile&demo=1");
  await page.getByRole("heading", { name: "Личный кабинет" }).waitFor();
  check(
    "Profile captions readable",
    await page
      .locator(".page-heading .eyebrow")
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize) >= 14),
  );
  await page.screenshot({
    path: "test-results/usability-profile.png",
    fullPage: true,
  });
  check("No runtime exceptions", errors.length === 0);
  await writeFile(
    "test-results/usability-verification.json",
    JSON.stringify({ date: new Date().toISOString(), checks, errors }, null, 2),
  );
  console.log(`\n${checks.length} checks passed`);
} catch (error) {
  console.error(
    `\nTest run stopped. ${checks.length} checks passed before the error.`,
  );
  throw error;
} finally {
  await browser.close();
}
