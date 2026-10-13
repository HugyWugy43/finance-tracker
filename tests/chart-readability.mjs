import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { expenseSlices, expensePercent } from "../lib/chart-geometry.ts";
const checks = [];
const check = (name, value) => {
  assert(value, name);
  checks.push(name);
};
for (const values of [[100000, 1000], [100000, 1], [100], [1, 1, 1, 1, 1, 1]]) {
  const total = values.reduce((a, b) => a + b, 0),
    slices = expenseSlices(
      values.map((total) => ({ total })),
      total,
    );
  check(
    `Exact proportions: ${values}`,
    Math.abs(slices.reduce((s, c) => s + c.degrees, 0) - 360) < 0.00001 &&
      slices.every((c) => !c.path.includes("NaN")),
  );
}
check(
  "Sub-percent expense is not labelled zero",
  expensePercent(1, 100001) === "<1%",
);
check("Zero category stays zero", expensePercent(0, 100001) === "0%");
check("Empty dataset stays empty", expenseSlices([], 0).length === 0);
await mkdir("test-results", { recursive: true });
const baseURL = process.env.ORBIT_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const now = new Date(),
  date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
let tiny = false;
await page.route("**/api/me", (route) =>
  route.fulfill({
    json: {
      user: {
        id: "visual",
        fullName: "Мария",
        nickname: "visual",
        email: "visual@example.test",
        budget: 5000000,
      },
    },
  }),
);
await page.route("**/api/transactions", (route) =>
  route.fulfill({
    json: {
      transactions: [
        {
          id: "1",
          type: "expense",
          category: "shopping",
          amount: 100000,
          title: "Покупка",
          date,
          account: "Основной счёт",
        },
        {
          id: "2",
          type: "expense",
          category: "home",
          amount: tiny ? 1 : 1000,
          title: "Дом",
          date,
          account: "Основной счёт",
        },
      ],
    },
  }),
);
for (const width of [1440, 834, 570, 390, 320]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(baseURL + "/?view=analytics");
  await page.getByRole("heading", { name: "Структура расходов" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  check(
    `${width}: no overflow`,
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const small = page
    .locator(".donut-slice")
    .filter({ has: page.locator("title", { hasText: "Дом:" }) })
    .locator(":scope > path");
  check(
    `${width}: small expense stays visible and rounded`,
    Number(await small.getAttribute("stroke-width")) >= 8 &&
      (await small.getAttribute("stroke-linecap")) === "round",
  );
  check(
    `${width}: legend readable`,
    await page
      .locator(".chart-legend strong")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 14),
  );
  check(
    `${width}: Golos Text loaded`,
    await page.evaluate(() => document.fonts.check('16px "Golos Text"')),
  );
  if ([1440, 390].includes(width))
    await page.screenshot({
      path: `test-results/analytics-readability-${width}.png`,
      fullPage: true,
    });
}
await page
  .getByRole("button", { name: "Добавить операцию", exact: true })
  .click();
const input = page.getByLabel("Сумма, ₽", { exact: true });
await input.fill("1250");
check(
  "Amount has comfortable inner padding",
  await input.evaluate(
    (el) => parseFloat(getComputedStyle(el).paddingLeft) >= 18,
  ),
);
await page.screenshot({
  path: "test-results/amount-readability-320.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Закрыть", exact: true }).click();
tiny = true;
await page.reload();
await page.locator(".tiny-expense-marker").waitFor();
check(
  "One kopeck has a visible marker",
  (await page.locator(".tiny-expense-marker").count()) === 1,
);
check(
  "One kopeck amount is retained",
  (await page
    .locator(".chart-legend")
    .getByText("0,01 ₽", { exact: true })
    .count()) === 1,
);
await page.unroute("**/api/me");
await page.route("**/api/me", (route) =>
  route.fulfill({ status: 401, json: { error: "Unauthorized" } }),
);
for (const width of [1440, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(baseURL);
  await page.getByRole("heading", { name: "С возвращением" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  check(
    `${width}: Onest loaded`,
    await page.evaluate(() => document.fonts.check("16px Onest")),
  );
  check(
    `${width}: login has no overflow`,
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  if (width === 1440)
    await page.screenshot({
      path: "test-results/auth-onest.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  check(
    `${width}: register has no overflow`,
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
check("No browser errors", errors.length === 0);
await writeFile(
  "test-results/readability-verification.json",
  JSON.stringify({ date: new Date().toISOString(), checks, errors }, null, 2),
);
await browser.close();
console.log(`${checks.length} checks passed`);
