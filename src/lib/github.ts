// The payout workflow supplies a short-lived GitHub App installation token.
async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!process.env.GITHUB_TOKEN) throw new Error("A GitHub App installation token is required.");
  const response = await fetch(`https://api.github.com${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
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

export async function addIssueComment(issueNumber: number, body: string): Promise<void> {
  const repo = process.env.GITHUB_REPO;
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("GITHUB_REPO must be owner/repo.");
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) throw new Error("Invalid issue number.");
  const created = await request<{ id: number }>(`/repos/${repo}/issues/${issueNumber}/comments`, { body });
  const saved = await request<{ body: string }>(`/repos/${repo}/issues/comments/${created.id}`);
  if (saved.body !== body) throw new Error("GitHub comment readback did not match.");
}

export async function moveProjectItemToStatus(itemId: string, statusName: string): Promise<void> {
  const projectId = process.env.GITHUB_PROJECT_ID;
  if (!projectId || !itemId) throw new Error("GITHUB_PROJECT_ID and project item ID are required.");
  const result = await request<{
    errors?: unknown[];
    data?: { node: { field: { id: string; options: { id: string; name: string }[] } | null } | null };
  }>("/graphql", {
    query: `query($projectId: ID!) { node(id: $projectId) { ... on ProjectV2 {
      field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
    } } }`,
    variables: { projectId },
  });
  const field = result.data?.node?.field;
  const option = field?.options?.find((candidate) => candidate.name === statusName);
  if (result.errors?.length || !field?.id || !option) throw new Error("Requested project status is unavailable.");
  const updated = await request<{ errors?: unknown[]; data?: { updateProjectV2ItemFieldValue: { projectV2Item: { id: string } } } }>("/graphql", {
    query: `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId,
        fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }) { projectV2Item { id } }
    }`,
    variables: { projectId, itemId, fieldId: field.id, optionId: option.id },
  });
  if (updated.errors?.length || updated.data?.updateProjectV2ItemFieldValue?.projectV2Item?.id !== itemId) {
    throw new Error("Project status update failed.");
  }
  const saved = await request<{
    errors?: unknown[];
    data?: { node: { project: { id: string }; fieldValueByName: { name: string } | null } | null };
  }>("/graphql", {
    query: `query($itemId: ID!) { node(id: $itemId) { ... on ProjectV2Item {
      project { id } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
    } } }`,
    variables: { itemId },
  });
  if (saved.errors?.length || saved.data?.node?.project.id !== projectId || saved.data.node.fieldValueByName?.name !== statusName) {
    throw new Error("Project status readback did not match.");
  }
}
