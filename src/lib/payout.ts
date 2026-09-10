import { randomUUID } from "node:crypto";
import { sendPayout, validatePayoutInfo, type PayoutInfo } from "./arkade";
import { addIssueComment, moveProjectItemToStatus } from "./github";

export function parsePayoutInfo(issueBody: string): PayoutInfo {
  const destinations = [...issueBody.matchAll(/^Payout destination:[ \t]*([^\r\n]*)\r?$/gm)];
  const amounts = [...issueBody.matchAll(/^Amount \(sats\):[ \t]*([^\r\n]*)\r?$/gm)];
  if (destinations.length !== 1 || amounts.length !== 1) {
    throw new Error("The issue must contain exactly one Payout destination: and Amount (sats): line.");
  }
  const address = destinations[0][1].trim();
  const amount = amounts[0][1].trim();
  if (!/^[1-9][0-9]*$/.test(amount)) throw new Error("Amount (sats) must be a positive decimal integer.");
  const info = { address, amountSats: Number(amount) };
  validatePayoutInfo(info);
  return info;
}

export async function recordPayoutProof(
  issueNumber: number,
  txid: string,
  amountSats: number,
  projectItemId = process.env.PROJECT_ITEM_ID,
): Promise<void> {
  if (!projectItemId) throw new Error("PROJECT_ITEM_ID is required.");
  if (!/^[0-9a-fA-F]{64}$/.test(txid) || !Number.isSafeInteger(amountSats) || amountSats <= 0) {
    throw new Error("Invalid payout proof.");
  }
  await addIssueComment(issueNumber, `Payout proof: ${txid}\nAmount (sats): ${amountSats}\nNetwork: testnet/regtest (not mainnet)`);
  await moveProjectItemToStatus(projectItemId, "Paid");
}

function config() {
  const repo = process.env.GITHUB_REPO;
  const projectId = process.env.GITHUB_PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  const appId = process.env.GITHUB_APP_ID;
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("GITHUB_REPO must be owner/repo.");
  if (!projectId || !token || !appId || !/^[1-9][0-9]*$/.test(appId) || !Number.isSafeInteger(Number(appId))) {
    throw new Error("GITHUB_PROJECT_ID, GITHUB_TOKEN (installation token), and GITHUB_APP_ID are required.");
  }
  return { repo, projectId, token, appId: Number(appId) };
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const { token } = config();
  const response = await fetch(`https://api.github.com${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  return response.json() as Promise<T>;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const result = await request<{ data?: T; errors?: unknown[] }>("/graphql", { query, variables });
  if (result.errors?.length || !result.data) throw new Error("GitHub project query failed.");
  return result.data;
}

type ProjectItem = {
  id: string;
  project: { id: string };
  fieldValueByName: { name: string } | null;
  content: { __typename: string; number?: number; repository?: { nameWithOwner: string } } | null;
};
const itemFields = `id project { id }
  fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
  content { __typename ... on Issue { number repository { nameWithOwner } } }`;

function isRepositoryIssue(item: ProjectItem): boolean {
  const { repo, projectId } = config();
  return item.project.id === projectId && item.content?.__typename === "Issue" &&
    item.content.repository?.nameWithOwner.toLowerCase() === repo.toLowerCase() &&
    Number.isSafeInteger(item.content.number) && Number(item.content.number) > 0;
}

export async function getAcceptedPayoutItems(): Promise<{ issueNumber: number; projectItemId: string }[]> {
  const { projectId } = config();
  const items = new Map<string, { issueNumber: number; projectItemId: string }>();
  let cursor: string | null = null;
  do {
    const data: { node: { items: { nodes: (ProjectItem | null)[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null } =
      await graphql(`query($projectId: ID!, $cursor: String) { node(id: $projectId) { ... on ProjectV2 {
        items(first: 100, after: $cursor) { nodes { ${itemFields} } pageInfo { hasNextPage endCursor } }
      } } }`, { projectId, cursor });
    if (!data.node?.items) throw new Error("GitHub project was not found.");
    for (const item of data.node.items.nodes) {
      if (item && isRepositoryIssue(item) && item.fieldValueByName?.name === "Accepted") {
        items.set(item.id, { issueNumber: item.content!.number!, projectItemId: item.id });
      }
    }
    const page = data.node.items.pageInfo;
    if (page.hasNextPage && (!page.endCursor || page.endCursor === cursor)) throw new Error("Project pagination did not advance.");
    cursor = page.hasNextPage ? page.endCursor : null;
  } while (cursor);
  return [...items.values()];
}

type Comment = { body: string | null; performed_via_github_app?: { id: number } | null };
async function getComments(issueNumber: number): Promise<Comment[]> {
  const comments: Comment[] = [];
  const { repo } = config();
  for (let page = 1; ; page++) {
    const batch = await request<Comment[]>(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
}

function isOwnComment(comment: Comment): boolean {
  return comment.performed_via_github_app?.id === config().appId;
}

async function getProjectItem(projectItemId: string, issueNumber: number): Promise<ProjectItem> {
  const data = await graphql<{ node: ProjectItem | null }>(
    `query($itemId: ID!) { node(id: $itemId) { ... on ProjectV2Item { ${itemFields} } } }`,
    { itemId: projectItemId },
  );
  if (!data.node || data.node.id !== projectItemId || !isRepositoryIssue(data.node) || data.node.content?.number !== issueNumber) {
    throw new Error("Project item does not match the configured repository and issue.");
  }
  return data.node;
}

export async function processPayout(
  issueNumber: number,
  projectItemId: string,
  expectedBody?: string,
  pay: typeof sendPayout = sendPayout,
): Promise<"paid" | "skipped"> {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0 || !projectItemId) throw new Error("A positive ISSUE_NUMBER and PROJECT_ITEM_ID are required.");
  const { repo } = config();
  let stage = "checking the approved project item";
  try {
    const item = await getProjectItem(projectItemId, issueNumber);
    if (item.fieldValueByName?.name === "Paid") return "skipped";
    if (item.fieldValueByName?.name !== "Accepted") throw new Error("Only Accepted items can be paid.");
    stage = "checking previous payout comments";
    const comments = (await getComments(issueNumber)).filter(isOwnComment);
    const proof = comments.find((comment) => /^Payout proof:/m.test(comment.body ?? ""));
    if (proof) {
      if (!/^Payout proof: [0-9a-fA-F]{64}\r?$/m.test(proof.body ?? "")) throw new Error("Malformed proof requires manual reconciliation.");
      await moveProjectItemToStatus(projectItemId, "Paid");
      return "skipped";
    }
    if (comments.some((comment) => /^Payout pending:/m.test(comment.body ?? ""))) {
      throw new Error("An earlier payout attempt requires manual reconciliation.");
    }
    stage = "validating the current issue body";
    const issue = await request<{ body: string | null; pull_request?: unknown }>(`/repos/${repo}/issues/${issueNumber}`);
    if (issue.pull_request || !issue.body || (expectedBody !== undefined && expectedBody !== issue.body)) {
      throw new Error("Dispatch body is stale, missing, or does not belong to an issue.");
    }
    const payout = parsePayoutInfo(issue.body);
    stage = "recording the payout attempt";
    // GitHub concurrency serializes runners; this durable, read-back marker also
    // blocks replay after a timeout or a payment that succeeded without a proof.
    const pendingBody = `Payout pending: ${randomUUID()}\nPayout destination: ${payout.address}\nAmount (sats): ${payout.amountSats}\nDo not retry automatically. If no proof appears, reconcile the wallet before a maintainer removes this marker.`;
    await addIssueComment(issueNumber, pendingBody);
    const pending = (await getComments(issueNumber)).filter((comment) => isOwnComment(comment) && /^Payout pending:/m.test(comment.body ?? ""));
    if (pending.length !== 1 || pending[0].body !== pendingBody) throw new Error("The payout attempt marker is missing, belongs to another App, or conflicts with another attempt.");
    stage = "rechecking approval before sending";
    const currentItem = await getProjectItem(projectItemId, issueNumber);
    const currentIssue = await request<{ body: string | null }>(`/repos/${repo}/issues/${issueNumber}`);
    if (currentItem.fieldValueByName?.name !== "Accepted" || currentIssue.body !== issue.body) {
      throw new Error("Approval or payout details changed before sending.");
    }
    stage = "sending through Arkade (the outcome may be unknown)";
    const { txid } = await pay(payout);
    stage = "recording the transaction proof and Paid status (funds were sent)";
    await recordPayoutProof(issueNumber, txid, payout.amountSats, projectItemId);
    return "paid";
  } catch {
    // Do not copy SDK/HTTP error payloads into public issues: they can contain secrets.
    const message = `Payout failed while ${stage}. Check the workflow configuration and reconcile any pending payment before retrying. No automatic resend will occur while a Payout pending: marker remains.`;
    try {
      const comments = await getComments(issueNumber);
      if (!comments.some((comment) => isOwnComment(comment) && comment.body === message)) await addIssueComment(issueNumber, message);
    } catch {
      console.error("Could not record the payout failure on GitHub.");
    }
    throw new Error(message);
  }
}
