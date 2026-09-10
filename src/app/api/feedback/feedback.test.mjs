// Run: node --test src/app/api/feedback/feedback.test.mjs
// HTTP contract tests only: no network calls or real GitHub credentials.
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";

const runtimeRequire = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "../../../..");
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

// Use the installed TypeScript compiler, without adding a test framework or
// changing production resolution. server-only is Next's build-time guard.
function modules() {
  const cache = new Map();
  function load(filename) {
    const full = path.resolve(root, filename);
    if (cache.has(full)) return cache.get(full).exports;
    const compiled = { exports: {} };
    cache.set(full, compiled);
    const source = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === "server-only") return {};
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith(".")) return load(path.resolve(path.dirname(full), `${name}.ts`));
      return runtimeRequire(name);
    };
    new Function("require", "module", "exports", source)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return { github: load("src/lib/github.ts"), data: load("src/lib/data.ts"),
    list: load("src/app/api/feedback/route.ts"), detail: load("src/app/api/feedback/[id]/route.ts"),
    vote: load("src/app/api/feedback/[id]/vote/route.ts"), types: load("src/lib/types.ts") };
}

function issue(number, overrides = {}) {
  return { number, node_id: `I_${number}`, title: `Feedback ${number}`, body: "Description",
    labels: [{ name: "feedback" }, { name: "category:bug" }], created_at: "2026-01-01T00:00:00Z",
    user: { login: "octocat" }, reactions: { "+1": 4 }, ...overrides };
}

const page = (nodes, endCursor = null) => ({ nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } });
const projectItem = (number, status, repository = "test-owner/feedback") => ({
  id: `PVTI_${number}`, content: { __typename: "Issue", number, repository: { nameWithOwner: repository } },
  fieldValueByName: status === null ? null : { name: status },
});
const field = { id: "STATUS", name: "Status", options: [{ id: "NEW", name: "New" }, { id: "PLANNED", name: "Planned" }] };
const input = { title: "Test feedback", description: "Please add this", category: "improvement", author: "Alice" };
const context = (id) => ({ params: Promise.resolve({ id }) });
const request = (body, contentType = "application/json") => new Request("http://localhost/api/feedback", {
  method: "POST", headers: { "Content-Type": contentType }, body: typeof body === "string" ? body : JSON.stringify(body),
});

function setup(t, options = {}) {
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    GITHUB_APP_ID: "123456", GITHUB_PROJECT_ID: "PVT_test", GITHUB_REPO: "test-owner/feedback",
    GITHUB_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).replace(/\n/g, "\\n"),
  });
  // The feedback service must work without passkey or payout credentials.
  delete process.env.ARKADE_MNEMONIC;
  delete process.env.NURI_PASSKEY_ORIGIN;
  t.after(() => { process.env = oldEnv; });
  const expected = [];
  const calls = [];
  const mismatches = [];
  const api = modules();
  const enqueue = (method, pathname, body, inspect, status = 200) => expected.push({ method, pathname, body, inspect, status });
  const graphql = (operation, data, inspect) => enqueue("POST", "/graphql", { data }, (body) => {
    assert.match(body.query, new RegExp(`\\b${operation}\\b`));
    assert.equal(body.variables.projectId, "PVT_test");
    inspect?.(body.variables);
  });
  const authenticate = (expires = new Date(Date.now() + 3600000).toISOString()) => {
    enqueue("GET", "/repos/test-owner/feedback/installation", { id: 9 }, (_body, headers) => {
      const jwt = headers.Authorization.replace("Bearer ", "");
      const [header, payload, signature] = jwt.split(".");
      assert.equal(JSON.parse(Buffer.from(header, "base64url")).alg, "RS256");
      const claims = JSON.parse(Buffer.from(payload, "base64url"));
      assert.equal(claims.iss, "123456");
      assert.ok(claims.iat < Date.now() / 1000);
      assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 600);
      assert.ok(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")));
    });
    enqueue("POST", "/app/installations/9/access_tokens", { token: "test-installation-token", expires_at: expires });
  };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    try {
      const next = expected.shift();
      assert.ok(next, `Unexpected GitHub request: ${init.method} ${url}`);
      assert.equal(new URL(url).origin, "https://api.github.com");
      assert.equal(new URL(url).pathname + new URL(url).search, next.pathname);
      assert.equal(init.method, next.method);
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal);
      if (next.pathname !== "/repos/test-owner/feedback/installation" && !next.pathname.endsWith("/access_tokens")) {
        assert.equal(init.headers.Authorization, "Bearer test-installation-token");
      }
      const body = init.body ? JSON.parse(init.body) : undefined;
      next.inspect?.(body, init.headers);
      calls.push(next);
      if (next.body instanceof Error) throw next.body;
      return Response.json(next.body, { status: next.status });
    } catch (error) {
      // Production catches network errors. Keep mock assertion failures visible
      // even in tests that deliberately expect a 502 response.
      if (error instanceof assert.AssertionError) mismatches.push(error.message);
      throw error;
    }
  });
  t.after(() => assert.deepEqual(mismatches, [], "HTTP contract mismatches"));
  t.after(() => assert.equal(expected.length, 0, "All expected GitHub calls must be consumed"));
  if (options.auth !== false) authenticate();
  return { ...api, enqueue, graphql, authenticate, calls };
}

test("installation auth signs a valid JWT, discovers installation and caches its token", async (t) => {
  const s = setup(t);
  await s.github.getInstallationOctokit();
  await s.github.getInstallationOctokit();
  assert.equal(s.calls.length, 2);
});

test("expired installation tokens are refreshed", async (t) => {
  const s = setup(t, { auth: false });
  s.authenticate(new Date(0).toISOString());
  await s.github.getInstallationOctokit();
  s.authenticate();
  await s.github.getInstallationOctokit();
  assert.equal(s.calls.length, 4);
});

test("list paginates REST and GraphQL, filters internal/PR items and joins by repository", async (t) => {
  const s = setup(t);
  // Prime auth because listFeedbackItems and getProjectItems run concurrently.
  await s.github.getInstallationOctokit();
  const issues = Array.from({ length: 100 }, (_, i) => issue(i + 1));
  issues[0].pull_request = {};
  issues[1].labels.push("internal");
  s.enqueue("GET", "/repos/test-owner/feedback/issues?state=open&labels=feedback&per_page=100&page=1", issues);
  s.graphql("FeedbackProjectItems", { node: { items: page([projectItem(3, "Paid", "other/repo"), null], "CURSOR") } }, (v) => assert.equal(v.after, null));
  s.enqueue("GET", "/repos/test-owner/feedback/issues?state=open&labels=feedback&per_page=100&page=2", [issue(101)]);
  s.graphql("FeedbackProjectItems", { node: { items: page([projectItem(3, "Planned"), projectItem(101, "In Progress")]) } }, (v) => assert.equal(v.after, "CURSOR"));
  const response = await s.list.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const items = await response.json();
  assert.equal(items.length, issues.length - 2 + 1);
  assert.equal(items.find((i) => i.number === 3).status, "Planned");
  assert.equal(items.find((i) => i.number === 101).status, "In Progress");
  assert.equal(items.find((i) => i.number === 4).status, "New");
  assert.equal(items[0].category, "bug");
  assert.equal(items[0].id, "3");
  assert.equal(items[0].votes, 4);
});

test("detail uses issue-number ids, restores attribution and reads project status", async (t) => {
  const s = setup(t);
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", issue(7, { body: "Body\n\n---\nSubmitted by (unverified): Alice" }));
  s.graphql("FeedbackProjectItems", { node: { items: page([projectItem(7, "Under Review")]) } });
  const response = await s.detail.GET(request({}), context("7"));
  assert.equal(response.status, 200);
  const item = await response.json();
  assert.equal(item.author, "Alice");
  assert.equal(item.body, "Body");
  assert.equal(item.status, "Under Review");
});

test("invalid ids and invalid POST payloads fail before GitHub auth", async (t) => {
  const s = setup(t, { auth: false });
  for (const id of ["0", "-1", "01", "1e2", "1.5", " 1", "9007199254740992", "abc"]) {
    assert.equal(await s.data.getFeedbackItem(id), null);
    assert.equal((await s.detail.GET(request({}), context(id))).status, 400);
    assert.equal((await s.vote.POST(request({}), context(id))).status, 400);
  }
  for (const body of [null, [], {}, { ...input, title: " " }, { ...input, category: "other" },
    { ...input, author: "Alice\nPaid: yes" }, { ...input, title: "x".repeat(257) },
    { ...input, description: "x".repeat(60001) }, { ...input, extra: true }, "{"]) {
    assert.equal((await s.list.POST(request(body))).status, 400);
  }
  assert.equal((await s.list.POST(request(input, "text/plain"))).status, 415);
  assert.equal(s.calls.length, 0);
});

test("single-item reads hide missing, non-feedback, internal and pull-request issues", async (t) => {
  const s = setup(t);
  for (const value of [issue(5, { labels: [] }), issue(5, { labels: ["feedback", "internal"] }), issue(5, { pull_request: {} })]) {
    s.enqueue("GET", "/repos/test-owner/feedback/issues/5", value);
    assert.equal((await s.detail.GET(request({}), context("5"))).status, 404);
  }
  s.enqueue("GET", "/repos/test-owner/feedback/issues/5", { message: "Not Found" }, undefined, 404);
  assert.equal((await s.detail.GET(request({}), context("5"))).status, 404);
});

test("creation validates project, creates issue, adds it, then sets New explicitly", async (t) => {
  const s = setup(t);
  s.graphql("FeedbackStatusField", { node: { fields: page([{ id: "OTHER", name: "Title" }], "FIELD_CURSOR") } });
  s.graphql("FeedbackStatusField", { node: { fields: page([field]) } }, (v) => assert.equal(v.after, "FIELD_CURSOR"));
  s.enqueue("POST", "/repos/test-owner/feedback/issues", issue(8, {
    title: input.title, body: `${input.description}\n\n---\nSubmitted by (unverified): Alice`,
    labels: ["feedback", "category:improvement", "public"],
  }), (body) => {
    assert.equal(body.title, input.title);
    assert.equal(body.body, `${input.description}\n\n---\nSubmitted by (unverified): Alice`);
    assert.deepEqual(body.labels, ["feedback", "category:improvement", "public"]);
  });
  s.graphql("FeedbackAddItem", { addProjectV2ItemById: { item: { id: "PVTI_8" } } }, (v) => assert.equal(v.contentId, "I_8"));
  s.graphql("FeedbackMoveItem", { updateProjectV2ItemFieldValue: { projectV2Item: { id: "PVTI_8" } } }, (v) => {
    assert.equal(v.itemId, "PVTI_8"); assert.equal(v.fieldId, "STATUS"); assert.equal(v.optionId, "NEW");
  });
  const response = await s.list.POST(request({ ...input, title: ` ${input.title} ` }));
  assert.equal(response.status, 201);
  const item = await response.json();
  assert.equal(item.number, 8); assert.equal(item.status, "New"); assert.equal(item.author, "Alice");
});

test("missing New option aborts before creating an issue", async (t) => {
  const s = setup(t);
  s.graphql("FeedbackStatusField", { node: { fields: page([{ ...field, options: [] }]) } });
  assert.equal((await s.list.POST(request(input))).status, 503);
});

test("partial project failures return created issue identity without retry or delete", async (t) => {
  const s = setup(t);
  s.graphql("FeedbackStatusField", { node: { fields: page([field]) } });
  s.enqueue("POST", "/repos/test-owner/feedback/issues", issue(8));
  s.enqueue("POST", "/graphql", { data: null, errors: [{ message: "sensitive upstream details" }] });
  const response = await s.list.POST(request(input));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.issueCreated, true);
  assert.equal(body.item.number, 8);
  assert.match(body.error, /Do not resubmit/);
  assert.ok(!JSON.stringify(body).includes("sensitive upstream details"));
});

test("vote adds App +1 and returns the re-fetched count, never a local increment", async (t) => {
  const s = setup(t);
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", issue(7));
  s.enqueue("POST", "/repos/test-owner/feedback/issues/7/reactions", { id: 1 }, (body) => assert.deepEqual(body, { content: "+1" }));
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", issue(7, { reactions: { "+1": 9 } }));
  const response = await s.vote.POST(request({}), context("7"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { votes: 9 });
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", issue(7, { labels: ["feedback", "internal"] }));
  assert.equal((await s.vote.POST(request({}), context("7"))).status, 404);
});

test("comment and status helpers send exact bodies and option IDs", async (t) => {
  const s = setup(t);
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", issue(7));
  s.enqueue("POST", "/repos/test-owner/feedback/issues/7/comments", { id: 1 }, (body) => assert.deepEqual(body, { body: "Reviewed." }));
  await s.github.addIssueComment(7, "Reviewed.");
  s.graphql("FeedbackStatusField", { node: { fields: page([field]) } });
  s.graphql("FeedbackMoveItem", { updateProjectV2ItemFieldValue: { projectV2Item: { id: "PVTI_7" } } }, (v) => {
    assert.equal(v.itemId, "PVTI_7"); assert.equal(v.optionId, "PLANNED");
  });
  await s.github.moveProjectItemToStatus("PVTI_7", "Planned");
});

test("unavailable projects, unknown statuses and upstream errors are not fabricated as New", async (t) => {
  const s = setup(t);
  s.graphql("FeedbackProjectItems", { node: null });
  await assert.rejects(s.github.getProjectItems(), /unavailable/);
  s.graphql("FeedbackProjectItems", { node: { items: page([projectItem(7, "Unconfigured")]) } });
  await assert.rejects(s.github.getProjectItems(), /unsupported/);
  s.enqueue("GET", "/repos/test-owner/feedback/issues/7", { message: "private details" }, undefined, 403);
  const response = await s.detail.GET(request({}), context("7"));
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("private details"));
});

test("network errors never trigger automatic mutation retries", async (t) => {
  const s = setup(t);
  s.graphql("FeedbackStatusField", { node: { fields: page([field]) } });
  s.enqueue("POST", "/repos/test-owner/feedback/issues", new Error("timeout"));
  const response = await s.list.POST(request(input));
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Check GitHub before retrying/);
});

test("missing config returns 503 without accessing credentials or making requests", async (t) => {
  const s = setup(t, { auth: false });
  delete process.env.GITHUB_APP_ID;
  const response = await s.list.GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "GitHub feedback is not configured." });
  assert.equal(s.calls.length, 0);
});
