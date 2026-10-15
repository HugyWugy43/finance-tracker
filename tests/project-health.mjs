import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.ORBIT_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
function check(name, value) {
  assert(value, name);
  checks.push(name);
}
await mkdir("test-results", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  let signedIn = false;
  await page.route("**/api/me", (route) =>
    route.fulfill(
      signedIn
        ? {
            json: {
              user: {
                id: "layout",
                fullName: "Мария Александрова",
                nickname: "layout",
                email: "layout@example.test",
                budget: 5000000,
              },
            },
          }
        : { status: 401, json: { error: "Unauthorized" } },
    ),
  );
  await page.route("**/api/transactions", (route) =>
    route.fulfill({ json: { transactions: [] } }),
  );
  for (const width of [320, 390, 570, 701, 730, 760, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    signedIn = false;
    await page.goto(baseURL + "/?view=profile&demo=1");
    await page
      .getByRole("heading", { name: "У финансов появится свой дом." })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    check(
      `${width}: profile images decode successfully`,
      await page.locator(".profile-guest img").evaluateAll(async (images) => {
        await Promise.all(images.map((img) => img.decode().catch(() => {})));
        return images.length > 0 && images.every((img) => img.naturalWidth > 0);
      }),
    );
    check(
      `${width}: profile text fits`,
      await page.locator(".profile-guest").evaluate((el) =>
        [...el.querySelectorAll("h2,p,button")].every((n) => {
          const r = n.getBoundingClientRect(),
            p = el.getBoundingClientRect();
          return (
            r.left >= p.left &&
            r.right <= p.right &&
            n.scrollWidth <= n.clientWidth + 1
          );
        }),
      ),
    );
    if (width <= 760)
      check(
        `${width}: profile heading and paragraph centered`,
        await page.locator(".profile-guest").evaluate((el) => {
          const center =
            el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2;
          return ["h2", "p"].every((s) => {
            const r = el.querySelector(s).getBoundingClientRect();
            return Math.abs(r.x + r.width / 2 - center) < 1;
          });
        }),
      );
    if (width === 390)
      await page.screenshot({
        path: "test-results/profile-mobile.png",
        fullPage: true,
      });
    signedIn = true;
    await page.goto(baseURL + "/?view=dashboard");
    await page.getByRole("heading", { name: "Куда уходят деньги" }).waitFor();
    const avatar = page.getByRole("button", {
      name: "Открыть профиль",
      exact: true,
    });
    check(
      `${width}: avatar is round and centered`,
      await avatar.evaluate((el) => {
        const s = getComputedStyle(el),
          r = el.getBoundingClientRect();
        return (
          r.width === r.height &&
          r.width >= 40 &&
          s.borderRadius === "50%" &&
          s.placeItems === "center"
        );
      }),
    );
    if (width <= 760) {
      check(
        `${width}: no empty status capsule`,
        await page.locator(".topbar-actions").evaluate((el) => {
          const a = el.querySelector(".avatar").getBoundingClientRect(),
            r = el.getBoundingClientRect();
          return Math.abs(a.width - r.width) < 1;
        }),
      );
      check(
        `${width}: overview uses one column`,
        await page
          .locator(".overview-grid")
          .evaluate(
            (el) =>
              getComputedStyle(el).gridTemplateColumns.split(" ").length === 1,
          ),
      );
    }
    check(
      `${width}: no overflow`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (width === 730)
      await page.screenshot({
        path: "test-results/dashboard-730.png",
        fullPage: true,
      });
    await avatar.click();
    await page
      .getByRole("heading", { name: "Личный кабинет", exact: true })
      .waitFor();
    check(
      `${width}: account button opens profile`,
      (await page
        .getByRole("heading", { name: "Мария Александрова", exact: true })
        .count()) === 1,
    );
  }
  const scripts = await page.locator("script").evaluateAll((nodes) =>
    nodes.map((n) => ({
      src: n.getAttribute("src"),
      type: n.type || "text/javascript",
      inlineBytes: n.textContent.length,
    })),
  );
  check(
    "No external capture or connector scripts",
    scripts.every(
      (s) =>
        !s.src || new URL(s.src, baseURL).origin === new URL(baseURL).origin,
    ),
  );
  check(
    "No legacy fonts loaded",
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .every((r) => !r.name.includes("manrope")),
    ),
  );
  check("No runtime errors", errors.length === 0);
  await writeFile(
    "test-results/project-health.json",
    JSON.stringify({ checks, errors, scripts }, null, 2),
  );
  console.log(
    `${checks.length} project checks passed; ${scripts.length} script tags`,
  );
} finally {
  await browser.close();
}
