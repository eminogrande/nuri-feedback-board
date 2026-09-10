"use client";

import { useEffect, useState } from "react";
import { feedbackIssueNumber, type FeedbackItem } from "./types";

export class FeedbackRequestError extends Error {
  constructor(message: string, readonly status: number, readonly createdItem?: FeedbackItem) {
    super(message);
  }
}

export async function readFeedbackResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // A project sync failure can follow a successful issue creation. Never offer
    // another submission when the API has already returned the created issue.
    const createdItem = body?.issueCreated === true && Number.isSafeInteger(body.item?.number) && body.item.number > 0
      ? body.item as FeedbackItem : undefined;
    throw new FeedbackRequestError(typeof body?.error === "string" ? body.error : "Could not load feedback. Please try again.", response.status, createdItem);
  }
  if (body === null) throw new Error("The feedback service returned an invalid response.");
  return body as T;
}

export async function getFeedbackItems(signal?: AbortSignal): Promise<FeedbackItem[]> {
  const items = await readFeedbackResponse<FeedbackItem[]>(await fetch("/api/feedback", { cache: "no-store", signal }));
  if (!Array.isArray(items)) throw new Error("The feedback service returned an invalid list.");
  return items;
}

export async function getFeedbackItem(id: string, signal?: AbortSignal): Promise<FeedbackItem | null> {
  if (feedbackIssueNumber(id) === null) return null;
  const response = await fetch(`/api/feedback/${id}`, { cache: "no-store", signal });
  return response.status === 404 ? null : readFeedbackResponse<FeedbackItem>(response);
}

export function useFeedback<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(undefined);
    setError("");
    void load(controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load feedback. Please try again.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load, revision]);

  return { data, loading, error, refresh: () => setRevision(value => value + 1) };
}
