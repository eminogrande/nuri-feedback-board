import "server-only";

import { sign } from "node:crypto";
import { z } from "zod";
import {
  categories,
  createFeedbackSchema,
  statuses,
  type CreateFeedbackInput,
  type FeedbackItem,
  type Status,
} from "./types";

// This integration validates only its own configuration. Public feedback must
// not require the unrelated payout wallet secret in getEnv().
const settingsSchema = z.object({
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  GITHUB_PROJECT_ID: z.string().min(1),
  GITHUB_REPO: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/),
});

function settings() {
  const result = settingsSchema.safeParse(process.env);
  if (!result.success) {
    throw new GitHubError("GitHub feedback is not configured.", 503);
  }
  return result.data;
}

export class GitHubError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GitHubError";
  }
}

export class FeedbackProjectSyncError extends Error {
  constructor(public readonly item: FeedbackItem) {
    super("The issue was created, but project synchronization failed. Do not resubmit; reconcile this issue in GitHub.");
    this.name = "FeedbackProjectSyncError";
  }
}

async function request<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "nuri-feedback-board",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // Writes are never retried: a timeout can follow a successful remote write.
    throw new GitHubError("GitHub request failed; a write may have completed. Check GitHub before retrying.", 502);
  }
  if (!response.ok) {
    throw new GitHubError(`GitHub request failed (${response.status}).`, response.status);
  }
  return response.json() as Promise<T>;
}

type Settings = ReturnType<typeof settings>;
let installationToken: { settings: Settings; token: string; expiresAt: number } | undefined;

/**
 * The packet's installation-client entry point. Native fetch/crypto provide the
 * small REST/GraphQL surface without changing the protected dependency files.
 */
export async function getInstallationOctokit() {
  const config = settings();
  const cached = installationToken;
  let token: string;
  if (cached && cached.expiresAt > Date.now() + 60000 &&
      cached.settings.GITHUB_APP_ID === config.GITHUB_APP_ID &&
      cached.settings.GITHUB_PRIVATE_KEY === config.GITHUB_PRIVATE_KEY &&
      cached.settings.GITHUB_REPO === config.GITHUB_REPO) {
    token = cached.token;
  } else {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: config.GITHUB_APP_ID })).toString("base64url");
    const message = `${header}.${payload}`;
    let signature: string;
    try {
      signature = sign("RSA-SHA256", Buffer.from(message), config.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n")).toString("base64url");
    } catch {
      throw new GitHubError("GitHub App private key is invalid.", 503);
    }
    const jwt = `${message}.${signature}`;
    const installation = await request<{ id: number }>(jwt, "GET", `/repos/${config.GITHUB_REPO}/installation`);
    const access = await request<{ token: string; expires_at: string }>(jwt, "POST", `/app/installations/${installation.id}/access_tokens`, {
      repositories: [config.GITHUB_REPO.split("/")[1]],
    });
    token = access.token;
    installationToken = { settings: config, token, expiresAt: Date.parse(access.expires_at) };
  }
  return {
    request: <T>(method: string, path: string, body?: unknown) => request<T>(token, method, path, body),
    async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
      const result = await request<{ data?: T; errors?: unknown[] }>(token, "POST", "/graphql", { query, variables });
      if (result.errors?.length || !result.data) {
        throw new GitHubError("GitHub project request failed.", 502);
      }
      return result.data;
    },
  };
}

interface Issue {
  number: number;
  node_id: string;
  title: string;
  body: string | null;
  labels: (string | { name?: string })[];
  created_at: string;
  user: { login: string } | null;
  reactions?: { "+1": number };
  pull_request?: unknown;
}

function labels(issue: Issue) {
  return issue.labels.map((label) => typeof label === "string" ? label : label.name);
}

function isFeedback(issue: Issue) {
  const names = labels(issue);
  return !issue.pull_request && names.includes("feedback") && !names.includes("internal");
}

function toFeedback(issue: Issue): FeedbackItem {
  const body = issue.body ?? "";
  // Only our trailing attribution is display metadata. It is not verified identity.
  const attribution = /\n\n---\nSubmitted by \(unverified\): ([^\r\n]+)$/.exec(body);
  return {
    id: String(issue.number),
    number: issue.number,
    title: issue.title,
    body: attribution ? body.slice(0, attribution.index) : body,
    category: categories.find((category) => labels(issue).includes(`category:${category}`)) ?? "feature",
    status: "New",
    votes: issue.reactions?.["+1"] ?? 0,
    createdAt: issue.created_at,
    author: attribution?.[1] ?? issue.user?.login ?? "Unknown",
  };
}

export async function listFeedbackItems(): Promise<FeedbackItem[]> {
  const client = await getInstallationOctokit();
  const items: FeedbackItem[] = [];
  for (let page = 1; ; page++) {
    const issues = await client.request<Issue[]>("GET", `/repos/${settings().GITHUB_REPO}/issues?state=open&labels=feedback&per_page=100&page=${page}`);
    items.push(...issues.filter(isFeedback).map(toFeedback));
    if (issues.length < 100) return items;
  }
}

type PageInfo = { hasNextPage: boolean; endCursor: string | null };
type Connection<T> = { nodes: (T | null)[]; pageInfo: PageInfo };
type ProjectItem = {
  id: string;
  content: { __typename: string; number?: number; repository?: { nameWithOwner: string } } | null;
  fieldValueByName: { name?: string } | null;
};

function nextCursor(pageInfo: PageInfo, previous: string | null): string | null {
  if (!pageInfo.hasNextPage) return null;
  if (!pageInfo.endCursor || pageInfo.endCursor === previous) {
    throw new GitHubError("GitHub returned invalid pagination.", 502);
  }
  return pageInfo.endCursor;
}

/** Only issue numbers in GITHUB_REPO are keys; other repositories can collide. */
export async function getProjectItems(): Promise<Map<number, Status>> {
  const client = await getInstallationOctokit();
  const config = settings();
  const result = new Map<number, Status>();
  let after: string | null = null;
  do {
    const data: { node: { items: Connection<ProjectItem> } | null } = await client.graphql(`
      query FeedbackProjectItems($projectId: ID!, $after: String) {
        node(id: $projectId) { ... on ProjectV2 {
          items(first: 100, after: $after) {
            nodes {
              id
              content { __typename ... on Issue { number repository { nameWithOwner } } }
              fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
            }
            pageInfo { hasNextPage endCursor }
          }
        } }
      }`, { projectId: config.GITHUB_PROJECT_ID, after });
    if (!data.node?.items) throw new GitHubError("GitHub project is unavailable.", 503);
    for (const item of data.node.items.nodes) {
      if (item?.content?.__typename !== "Issue" ||
          item.content.repository?.nameWithOwner.toLowerCase() !== config.GITHUB_REPO.toLowerCase() ||
          !item.content.number) continue;
      const status = item.fieldValueByName?.name ?? "New";
      if (!statuses.includes(status as Status)) {
        throw new GitHubError("GitHub project has an unsupported Status option.", 503);
      }
      result.set(item.content.number, status as Status);
    }
    after = nextCursor(data.node.items.pageInfo, after);
  } while (after);
  return result;
}

type StatusField = { id: string; name: string; options: { id: string; name: string }[] };

async function statusOption(client: Awaited<ReturnType<typeof getInstallationOctokit>>, status: Status) {
  let after: string | null = null;
  do {
    const data: { node: { fields: Connection<StatusField> } | null } = await client.graphql(`
      query FeedbackStatusField($projectId: ID!, $after: String) {
        node(id: $projectId) { ... on ProjectV2 {
          fields(first: 100, after: $after) {
            nodes { ... on ProjectV2SingleSelectField { id name options { id name } } }
            pageInfo { hasNextPage endCursor }
          }
        } }
      }`, { projectId: settings().GITHUB_PROJECT_ID, after });
    if (!data.node?.fields) throw new GitHubError("GitHub project is unavailable.", 503);
    const field = data.node.fields.nodes.find((field) => field?.name === "Status");
    if (field) {
      const option = field.options.find((option) => option.name === status);
      if (!option) throw new GitHubError(`GitHub project is missing the ${status} Status option.`, 503);
      return { fieldId: field.id, optionId: option.id };
    }
    after = nextCursor(data.node.fields.pageInfo, after);
  } while (after);
  throw new GitHubError("GitHub project is missing its Status field.", 503);
}

async function updateStatus(client: Awaited<ReturnType<typeof getInstallationOctokit>>, itemId: string, option: { fieldId: string; optionId: string }) {
  await client.graphql(`
    mutation FeedbackMoveItem($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }`, { projectId: settings().GITHUB_PROJECT_ID, itemId, ...option });
}

export async function moveProjectItemToStatus(itemId: string, statusName: Status): Promise<void> {
  if (!itemId || !statuses.includes(statusName)) throw new GitHubError("Invalid project status update.", 400);
  const client = await getInstallationOctokit();
  await updateStatus(client, itemId, await statusOption(client, statusName));
}

export async function createFeedbackIssue(input: CreateFeedbackInput): Promise<FeedbackItem> {
  const validated = createFeedbackSchema.parse(input);
  const client = await getInstallationOctokit();
  // Validate project configuration before creating an irreversible issue.
  const option = await statusOption(client, "New");
  const issue = await client.request<Issue>("POST", `/repos/${settings().GITHUB_REPO}/issues`, {
    title: validated.title,
    body: `${validated.description}\n\n---\nSubmitted by (unverified): ${validated.author}`,
    labels: ["feedback", `category:${validated.category}`, "public"],
  });
  const item = toFeedback(issue);
  try {
    const project = await client.graphql<{ addProjectV2ItemById: { item: { id: string } } }>(`
      mutation FeedbackAddItem($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) { item { id } }
      }`, { projectId: settings().GITHUB_PROJECT_ID, contentId: issue.node_id });
    await updateStatus(client, project.addProjectV2ItemById.item.id, option);
  } catch {
    // The issue already exists. Return its identity instead of a generic failure
    // that encourages duplicate submissions; never delete a user's issue.
    throw new FeedbackProjectSyncError(item);
  }
  return item;
}

export async function getFeedbackIssue(number: number): Promise<FeedbackItem | null> {
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  const client = await getInstallationOctokit();
  let issue: Issue;
  try {
    issue = await client.request<Issue>("GET", `/repos/${settings().GITHUB_REPO}/issues/${number}`);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
  return isFeedback(issue) ? toFeedback(issue) : null;
}

export async function addIssueComment(number: number, body: string): Promise<void> {
  if (!body.trim() || body.length > 65536) throw new GitHubError("Invalid comment body.", 400);
  if (!await getFeedbackIssue(number)) throw new GitHubError("Feedback not found.", 404);
  const client = await getInstallationOctokit();
  await client.request("POST", `/repos/${settings().GITHUB_REPO}/issues/${number}/comments`, { body });
}

export async function addFeedbackVote(number: number): Promise<number | null> {
  if (!await getFeedbackIssue(number)) return null;
  const client = await getInstallationOctokit();
  // Placeholder: GitHub permits only one +1 per App identity, not per visitor.
  await client.request("POST", `/repos/${settings().GITHUB_REPO}/issues/${number}/reactions`, { content: "+1" });
  return (await getFeedbackIssue(number))?.votes ?? null;
}
