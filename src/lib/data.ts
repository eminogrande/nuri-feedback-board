import "server-only";

import { createFeedbackIssue, getFeedbackIssue, getProjectItems, listFeedbackItems } from "./github";
import { feedbackIssueNumber, type CreateFeedbackInput, type FeedbackItem } from "./types";

export async function getFeedbackItems(): Promise<FeedbackItem[]> {
  const [items, project] = await Promise.all([listFeedbackItems(), getProjectItems()]);
  return items.map((item) => ({ ...item, status: project.get(item.number) ?? "New" }));
}

export async function getFeedbackItem(id: string): Promise<FeedbackItem | null> {
  const number = feedbackIssueNumber(id);
  if (number === null) return null;
  const item = await getFeedbackIssue(number);
  if (!item) return null;
  const project = await getProjectItems();
  return { ...item, status: project.get(item.number) ?? "New" };
}

export async function createFeedbackItem(input: CreateFeedbackInput): Promise<FeedbackItem> {
  return createFeedbackIssue(input);
}
