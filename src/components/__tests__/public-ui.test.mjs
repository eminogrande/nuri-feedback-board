// Run against `pnpm run start --hostname 127.0.0.1 --port 3187` after building:
// node --test src/components/__tests__/public-ui.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.UI_TEST_URL ?? "http://127.0.0.1:3187";

async function page(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, expectedStatus, path);
  const html = await response.text();
  // Ignore streamed React data: assertions must inspect rendered HTML, not props.
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function ids(html) {
  return [...html.matchAll(/<article\b[^>]*aria-labelledby="feedback-(\d+)"/g)].map((match) => match[1]);
}

test("landing links to all three category-aware forms", async () => {
  const html = await page("/");
  assert.match(html, /Help shape Nuri/);
  for (const category of ["feature", "bug", "improvement"]) {
    assert.ok(html.includes(`href="/feedback?category=${category}"`));
  }
  assert.match(html, /How it works/);
  assert.match(html, /text-\[17px\]/);
});

test("board search and category filters work together and handle invalid input", async () => {
  assert.deepEqual(ids(await page("/board")), ["101", "102", "103", "104", "105", "106"]);
  assert.deepEqual(ids(await page("/board?category=bug")), ["104", "106"]);
  assert.deepEqual(ids(await page("/board?category=improvement")), ["102", "103"]);
  assert.deepEqual(ids(await page("/board?category=feature&q=%20BALANCE%20")), ["101"]);
  assert.deepEqual(ids(await page("/board?category=feature&q=keyboard")), []);
  assert.match(await page("/board?q=unmatched-search-term"), /No matching ideas/);
  assert.equal(ids(await page("/board?category=not-a-category")).length, 6);
  assert.equal(ids(await page("/board?category=bug&category=feature&q=x&q=y")).length, 6);
  const escaped = await page("/board?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
  assert.ok(!escaped.includes("<img src=x onerror=alert(1)>"));
});

test("roadmap has all four columns and matching example records", async () => {
  const html = await page("/roadmap");
  for (const status of ["Under Review", "Planned", "In Progress", "Done"]) {
    assert.ok(html.includes(`<section aria-label="${status}"`));
  }
  assert.deepEqual(ids(html).sort(), ["101", "102", "103", "104", "105", "106"]);
});

test("submission form honors category links and starts disabled", async () => {
  for (const category of ["feature", "bug", "improvement"]) {
    const html = await page(`/feedback?category=${category}`);
    assert.ok(html.includes(`value="${category}" selected=""`));
    assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/);
    assert.match(html, /feedback is not sent or saved/);
  }
  assert.ok((await page("/feedback?category=constructor")).includes('value="feature" selected=""'));
});

test("every sample card has a matching detail page; unknown and prototype IDs return 404", async () => {
  const html = await page("/board");
  for (const id of ids(html)) {
    const detail = await page(`/feedback/${id}`);
    const heading = html.match(new RegExp(`<h3 id="feedback-${id}"[^>]*><a[^>]*>(.*?)</a>`))[1];
    assert.ok(detail.includes(heading), `detail ${id} title matches board`);
    assert.ok(detail.includes(`Example feedback #<!-- -->${id}`));
  }
  for (const id of ["unknown", "constructor", "__proto__"]) {
    // Next streams the 404 boundary through React; the browser check verifies its visible content.
    assert.match(await page(`/feedback/${id}`, 404), /name="robots" content="noindex"/);
  }
});
