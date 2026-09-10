import { ArkAddress, RestArkProvider, Wallet } from "@arkade-os/sdk";
import { sendPayout } from "../src/lib/arkade";
import { getAcceptedPayoutItems, parsePayoutInfo, processPayout } from "../src/lib/payout";

async function main(): Promise<void> {
  if (process.argv[2] === "--self-test") return selfTest();
  if (process.argv.length > 2) throw new Error("Only --self-test is supported.");
  const { ISSUE_NUMBER, ISSUE_BODY, PROJECT_ITEM_ID, GITHUB_EVENT_NAME } = process.env;
  if (GITHUB_EVENT_NAME === "schedule") {
    if (ISSUE_NUMBER || ISSUE_BODY || PROJECT_ITEM_ID) throw new Error("Scheduled payouts must not contain dispatch inputs.");
    // Process sequentially: all issues spend from the same wallet.
    const items = await getAcceptedPayoutItems();
    let failures = 0;
    for (const item of items) {
      try {
        const result = await processPayout(item.issueNumber, item.projectItemId);
        console.log(`Issue #${item.issueNumber}: ${result}`);
      } catch (error) {
        failures++;
        console.error(`Issue #${item.issueNumber}: ${error instanceof Error ? error.message : "Payout failed."}`);
      }
    }
    console.log(`Accepted items: ${items.length}; failures: ${failures}`);
    if (failures) process.exitCode = 1;
    return;
  }
  if (!ISSUE_NUMBER || !/^[1-9][0-9]*$/.test(ISSUE_NUMBER) || !ISSUE_BODY || !PROJECT_ITEM_ID) {
    throw new Error("Manual payouts require ISSUE_NUMBER (positive integer), ISSUE_BODY, and PROJECT_ITEM_ID.");
  }
  const result = await processPayout(Number(ISSUE_NUMBER), PROJECT_ITEM_ID, ISSUE_BODY);
  console.log(`Issue #${ISSUE_NUMBER}: ${result}`);
}

// Run with `pnpm exec tsx scripts/payout.ts --self-test`. All network and sends
// are mocked; this is a regression check, NOT evidence of a funded testnet send.
async function selfTest(): Promise<void> {
  const assert: typeof import("node:assert/strict") = (await import("node:assert/strict")).default;
  const address = new ArkAddress(new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), "tark").encode();
  const body = `Payout destination: ${address}\nAmount (sats): 50000`;
  assert.deepEqual(parsePayoutInfo(body), { address, amountSats: 50000 });
  assert.deepEqual(parsePayoutInfo(body.replaceAll("\n", "\r\n")), { address, amountSats: 50000 });
  for (const amount of ["0", "-1", "+1", "1.5", "1e3", "01", "50,000", "", "9007199254740992", "2100000000000001"]) {
    assert.throws(() => parsePayoutInfo(`Payout destination: ${address}\nAmount (sats): ${amount}`));
  }
  for (const invalid of ["", `${body}\nAmount (sats): 1`, `${body}\nPayout destination: ${address}`, body.replace(address, "tark1invalid")]) {
    assert.throws(() => parsePayoutInfo(invalid));
  }

  const savedEnv = { ...process.env };
  const savedFetch = globalThis.fetch;
  const savedCreate = Wallet.create;
  const savedInfo = RestArkProvider.prototype.getInfo;
  const txid = "a".repeat(64); // Synthetic transaction ID for offline tests only.
  type TestComment = { id: number; body: string; performed_via_github_app: { id: number } | null };
  let comments: TestComment[] = [];
  let status = "Accepted";
  let issueBody = body;
  let repository = "example/feedback";
  let sendCount = 0;
  let failProof = false;
  let failStatus = false;
  let changeBodyAfterMarker = false;
  let badReadback = false;
  let itemId = "ITEM";
  let listPages = 0;
  let commentPages = 0;
  let commentAppId = 123;
  const makeItem = (id = itemId, state = status, repo = repository) => ({
    id, project: { id: "PROJECT" }, fieldValueByName: { name: state },
    content: { __typename: "Issue", number: 1, repository: { nameWithOwner: repo } },
  });
  function reset() {
    comments = []; status = "Accepted"; issueBody = body; repository = "example/feedback";
    sendCount = 0; failProof = false; failStatus = false; changeBodyAfterMarker = false; badReadback = false;
    itemId = "ITEM"; listPages = 0; commentPages = 0;
    commentAppId = 123;
  }
  const pay = async (info: { address: string; amountSats: number }) => {
    assert.deepEqual(info, { address, amountSats: 50000 });
    assert.ok(comments.some((comment) => comment.body.startsWith("Payout pending:")));
    sendCount++;
    return { txid };
  };
  try {
    Object.assign(process.env, {
      GITHUB_REPO: "example/feedback", GITHUB_PROJECT_ID: "PROJECT", GITHUB_TOKEN: "offline-test-token", GITHUB_APP_ID: "123",
      ARKADE_SERVER_URL: "http://localhost:7070",
      // Public BIP39 test vector, never a funded wallet.
      ARKADE_MNEMONIC: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    globalThis.fetch = async (input, options) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.github.com", "Offline check must not reach an Arkade service");
      const payload = options?.body ? JSON.parse(String(options.body)) : undefined;
      const reply = (data: unknown, code = 200) => Promise.resolve(new Response(JSON.stringify(data), { status: code }));
      if (url.pathname === "/graphql") {
        const query = String(payload.query);
        if (query.includes("items(first:")) {
          listPages++;
          return reply({ data: { node: { items: {
            nodes: payload.variables.cursor ? [makeItem("SECOND")] : [makeItem(), makeItem("PAID", "Paid"), makeItem("OTHER", "Accepted", "other/repo"), null],
            pageInfo: { hasNextPage: !payload.variables.cursor, endCursor: payload.variables.cursor ? null : "NEXT" },
          } } } });
        }
        if (query.includes('field(name: "Status")')) return reply({ data: { node: { field: { id: "FIELD", options: [{ id: "PAID", name: "Paid" }] } } } });
        if (query.includes("mutation")) {
          if (failStatus) return reply({ errors: [{ message: "offline status failure" }] });
          assert.equal(payload.variables.optionId, "PAID");
          status = "Paid";
          return reply({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: itemId } } } });
        }
        return reply({ data: { node: makeItem(payload.variables.itemId) } });
      }
      if (url.pathname === "/repos/example/feedback/issues/1/comments") {
        if (options?.method === "POST") {
          if (failProof && payload.body.startsWith("Payout proof:")) return reply({}, 503);
          const comment = { id: comments.length + 1, body: payload.body, performed_via_github_app: { id: commentAppId } };
          comments.push(comment);
          if (changeBodyAfterMarker && payload.body.startsWith("Payout pending:")) issueBody = `${body}\nEdited`;
          return reply(comment, 201);
        }
        commentPages++;
        const start = (Number(url.searchParams.get("page")) - 1) * 100;
        return reply(comments.slice(start, start + 100));
      }
      if (url.pathname.startsWith("/repos/example/feedback/issues/comments/")) {
        const comment = comments.find((entry) => entry.id === Number(url.pathname.split("/").pop()));
        return reply(badReadback ? { ...comment, body: "wrong body" } : comment);
      }
      if (url.pathname === "/repos/example/feedback/issues/1") return reply({ body: issueBody });
      throw new Error(`Unexpected offline request: ${url}`);
    };

    assert.equal(await processPayout(1, "ITEM", body, pay), "paid");
    assert.equal(sendCount, 1); assert.equal(status, "Paid");
    assert.ok(comments.some((comment) => comment.body.startsWith(`Payout proof: ${txid}`)));
    assert.equal(await processPayout(1, "ITEM", body, pay), "skipped");
    assert.equal(sendCount, 1);
    status = "Accepted";
    assert.equal(await processPayout(1, "ITEM", body, pay), "skipped");
    assert.equal(sendCount, 1); assert.equal(status, "Paid");

    reset();
    comments = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, body: "Ordinary comment", performed_via_github_app: null }));
    comments.push({ id: 101, body: `Payout proof: ${txid}`, performed_via_github_app: { id: 123 } });
    assert.equal(await processPayout(1, "ITEM", body, pay), "skipped");
    assert.equal(sendCount, 0); assert.equal(commentPages, 2);

    reset();
    comments.push({ id: 1, body: `Payout proof: ${txid}`, performed_via_github_app: null });
    assert.equal(await processPayout(1, "ITEM", body, pay), "paid", "User-authored proof is not trusted");
    assert.equal(sendCount, 1);

    reset(); failProof = true;
    await assert.rejects(processPayout(1, "ITEM", body, pay), /funds were sent/);
    failProof = false;
    await assert.rejects(processPayout(1, "ITEM", body, pay), /previous payout comments/);
    assert.equal(sendCount, 1, "Lost proof must never cause a second payment");

    reset(); failStatus = true;
    await assert.rejects(processPayout(1, "ITEM", body, pay), /funds were sent/);
    failStatus = false;
    assert.equal(await processPayout(1, "ITEM", body, pay), "skipped");
    assert.equal(sendCount, 1); assert.equal(status, "Paid");

    reset();
    await assert.rejects(processPayout(1, "ITEM", body, async () => { sendCount++; throw new Error("offline transport failure"); }), /outcome may be unknown/);
    await assert.rejects(processPayout(1, "ITEM", body, pay), /previous payout comments/);
    assert.equal(sendCount, 1);
    const failureCommentCount = comments.length;
    await assert.rejects(processPayout(1, "ITEM", body, pay), /previous payout comments/);
    assert.equal(comments.length, failureCommentCount, "Repeated failures must not spam issue comments");

    for (const setup of [
      () => { status = "New"; },
      () => { repository = "other/repo"; },
      () => { issueBody = "invalid body"; },
      () => { changeBodyAfterMarker = true; },
      () => { badReadback = true; },
      () => { commentAppId = 456; },
    ]) {
      reset(); setup();
      await assert.rejects(processPayout(1, "ITEM", body, pay));
      assert.equal(sendCount, 0);
    }
    reset();
    const items = await getAcceptedPayoutItems();
    assert.deepEqual(items, [{ issueNumber: 1, projectItemId: "ITEM" }, { issueNumber: 1, projectItemId: "SECOND" }]);
    assert.equal(listPages, 2);

    let network = "bitcoin";
    Object.defineProperty(RestArkProvider.prototype, "getInfo", { configurable: true, writable: true, value: async () => ({ network, signerPubkey: `02${"01".repeat(32)}` }) });
    let disposed = false;
    Object.defineProperty(Wallet, "create", { configurable: true, writable: true, value: async (options: Parameters<typeof Wallet.create>[0]) => {
      assert.equal(options.walletMode, "static"); assert.equal(options.settlementConfig, false);
      assert.ok(options.storage?.walletRepository); assert.ok(options.storage?.contractRepository);
      return {
        sendBitcoin: async (info: { address: string; amount: number }) => {
          assert.deepEqual(info, { address, amount: 50000 }); sendCount++; return txid;
        },
        dispose: async () => { disposed = true; },
      };
    } });
    sendCount = 0;
    await assert.rejects(sendPayout({ address, amountSats: 50000 }), /restricted to testnet/);
    assert.equal(sendCount, 0);
    network = "regtest";
    assert.deepEqual(await sendPayout({ address, amountSats: 50000 }), { txid });
    assert.equal(sendCount, 1); assert.equal(disposed, true);
    const otherServer = new ArkAddress(new Uint8Array(32).fill(3), new Uint8Array(32).fill(2), "tark").encode();
    await assert.rejects(sendPayout({ address: otherServer, amountSats: 50000 }), /does not match/);
    assert.equal(sendCount, 1);

    reset();
    const savedArguments = process.argv;
    try {
      process.argv = process.argv.slice(0, 2);
      delete process.env.ISSUE_NUMBER;
      delete process.env.ISSUE_BODY;
      delete process.env.PROJECT_ITEM_ID;
      delete process.env.GITHUB_EVENT_NAME;
      await assert.rejects(main(), /Manual payouts require/);
      process.env.GITHUB_EVENT_NAME = "schedule";
      await main();
      assert.equal(sendCount, 1, "Scheduled items are processed without paying one issue twice");
      assert.equal(status, "Paid");
      assert.equal(listPages, 2);
    } finally {
      process.argv = savedArguments;
    }
    console.log("PASS: offline payout parser, CLI/polling, pagination, acceptance, idempotency, recovery, readback, and testnet-only SDK adapter checks.");
  } finally {
    globalThis.fetch = savedFetch;
    Wallet.create = savedCreate;
    RestArkProvider.prototype.getInfo = savedInfo;
    process.env = savedEnv;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Payout failed.");
  process.exitCode = 1;
});
