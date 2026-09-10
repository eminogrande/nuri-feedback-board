// Optional browser regression check against a running production build.
// npm install --prefix .next/cache/ui-verification --no-audit --no-fund --package-lock=false playwright @axe-core/playwright
// .next/cache/ui-verification/node_modules/.bin/playwright install chromium
// node src/components/__tests__/public-ui.browser.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dependencies = process.env.UI_BROWSER_DEPS ?? ".next/cache/ui-verification/node_modules";
const { chromium } = await import(pathToFileURL(resolve(dependencies, "playwright/index.mjs")));
const { default: AxeBuilder } = await import(pathToFileURL(resolve(dependencies, "@axe-core/playwright/dist/index.mjs")));
const base = process.env.UI_TEST_URL ?? "http://127.0.0.1:3187";
const artifacts = resolve(".next/cache/ui-verification/artifacts");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const report = [];

try {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/board", "/roadmap", "/feedback?category=bug", "/feedback/101"]) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
        fontSize: getComputedStyle(document.documentElement).fontSize,
        scheme: getComputedStyle(document.documentElement).colorScheme,
      }));
      assert.equal(dimensions.fontSize, "17px");
      assert.equal(dimensions.scheme, "light");
      assert.ok(dimensions.content <= dimensions.viewport, `${route} overflows at ${width}: ${JSON.stringify(dimensions)}`);
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(audit.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), [], `${route} accessibility at ${width}`);
      const filename = `${width}-${route === "/" ? "home" : route.replace(/[^a-z0-9]/gi, "-")}.png`;
      await page.screenshot({ path: resolve(artifacts, filename), fullPage: true });
      report.push({ route, width, ...dimensions, accessibilityViolations: audit.violations.length, screenshot: filename });
    }
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${base}/feedback?category=bug`);
  assert.equal(await page.getByLabel("Category", { exact: true }).inputValue(), "bug");
  const submit = page.getByRole("button", { name: "Submit feedback", exact: true });
  assert.equal(await submit.isDisabled(), true);
  await page.getByLabel("Title (required)").fill("   ");
  await page.getByLabel("Description (required)").fill("   ");
  assert.equal(await submit.isDisabled(), true);
  await page.getByLabel("Title (required)").fill("Keep my selected currency");
  assert.equal(await submit.isDisabled(), true);
  await page.getByLabel("Description (required)").fill("Remember my display preference after I reopen Nuri.");
  assert.equal(await submit.isEnabled(), true);
  const writes = [];
  page.on("request", (request) => { if (request.method() === "POST") writes.push(request.url()); });
  await submit.click();
  await page.getByRole("status").filter({ hasText: "Nothing was submitted or saved" }).waitFor();
  assert.deepEqual(writes, []);
  assert.equal(await page.getByLabel("Title (required)").inputValue(), "Keep my selected currency");
  await page.getByLabel("Description (required)").fill("");
  assert.equal(await submit.isDisabled(), true);

  await page.goto(`${base}/board`);
  const vote = page.getByRole("button", { name: "Preview an upvote for Add a home screen balance widget", exact: true });
  assert.equal(await vote.innerText(), "42");
  await vote.click();
  const voted = page.getByRole("button", { name: "Remove preview vote for Add a home screen balance widget", exact: true });
  assert.equal(await voted.getAttribute("aria-pressed"), "true");
  assert.equal(await voted.innerText(), "43");
  await voted.click();
  assert.equal(await vote.innerText(), "42");
  await page.getByRole("navigation", { name: "Feedback categories" }).getByRole("link", { name: "Bug report", exact: true }).click();
  await page.waitForURL("**/board?category=bug");
  assert.equal(await page.locator("article").count(), 2);
  await page.getByRole("searchbox", { name: "Search feedback" }).fill("keyboard");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL("**/board?category=bug&q=keyboard");
  assert.equal(await page.locator("article").count(), 1);
  await page.getByRole("link", { name: "Fix the keyboard covering the amount field", exact: true }).click();
  await page.waitForURL("**/feedback/104");
  await page.getByRole("heading", { name: "Fix the keyboard covering the amount field", exact: true }).waitFor();

  for (const id of ["unknown", "constructor", "__proto__"]) {
    const response = await page.goto(`${base}/feedback/${id}`);
    assert.equal(response.status(), 404);
    await page.getByRole("heading", { name: "This idea isn't on the board", exact: true }).waitFor();
    assert.equal(await page.title(), "Feedback not found | Nuri Feedback");
  }

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(base);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(255, 255, 255)");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "Skip to content");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
  assert.deepEqual(errors, []);
  await writeFile(resolve(artifacts, "report.json"), JSON.stringify({ pages: report, interactions: "PASS", pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ pageChecks: report.length, interactions: "PASS", accessibilityViolations: 0, horizontalOverflow: 0, pageErrors: errors, artifacts }, null, 2));
} finally {
  await browser.close();
}
