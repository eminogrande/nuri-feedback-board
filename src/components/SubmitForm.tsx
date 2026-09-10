"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { categories, type Category } from "@/components/CategoryBadge";
import { PasskeySignInButton, useAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackRequestError, readFeedbackResponse } from "@/lib/client-data";
import type { FeedbackItem } from "@/lib/types";

export function SubmitForm({ initialCategory = "feature" }: { initialCategory?: Category }) {
  const router = useRouter();
  const { username, loading, error: sessionError, refresh } = useAuth();
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [createdItem, setCreatedItem] = useState<FeedbackItem>();
  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !username || loading || sessionError || submitting.current || createdItem) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const item = await readFeedbackResponse<FeedbackItem>(await fetch("/api/feedback", {
        method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
        // The existing API requires author as display attribution. Its middleware
        // authenticates the session; this field is not proof of identity.
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, author: username }),
      }));
      if (!Number.isSafeInteger(item.number) || item.number <= 0) throw new Error("Feedback may have been created, but its link was missing.");
      setCreatedItem(item);
      router.push(`/feedback/${item.number}`);
    } catch (error) {
      if (error instanceof FeedbackRequestError) {
        if (error.status === 401) refresh();
        if (error.createdItem) setCreatedItem(error.createdItem);
      }
      const message = error instanceof Error ? error.message : "Could not confirm submission.";
      setError(error instanceof FeedbackRequestError && error.status < 500 ? message : `${message} Check the board before submitting again.`);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (createdItem) return <div className="space-y-4" role="status"><p>Your feedback was created as #{createdItem.number}.</p>{error && <p>{error} Please do not submit it again.</p>}<Link href={`/feedback/${createdItem.number}`} className="inline-flex min-h-12 items-center text-violet-800 underline underline-offset-4">View your feedback</Link></div>;
  if (loading) return <p role="status">Checking your session…</p>;
  if (sessionError) return <div className="space-y-4"><p role="alert">{sessionError}</p><Button variant="outline" onClick={refresh}>Retry session</Button></div>;
  if (!username) return <div className="space-y-5"><p>Sign in with your Nuri passkey to submit feedback.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<PasskeySignInButton /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Give feedback" aria-busy={pending}>
      <p className="leading-relaxed text-slate-600">Submitting as <strong className="break-all">{username}</strong>. Your feedback and display name will be public on GitHub.</p>
      <div className="space-y-2">
        <label htmlFor="category" className="block font-medium">Category</label>
        <select id="category" name="category" value={category} onChange={event => setCategory(event.target.value as Category)} disabled={pending} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
          {Object.entries(categories).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="title" className="block font-medium">Title <span className="font-normal text-slate-500">(required)</span></label>
        <Input id="title" name="title" placeholder="A short, clear summary" required maxLength={180} value={title} disabled={pending} onChange={event => setTitle(event.target.value)} />
      </div>
      <div className="space-y-2">
        <label htmlFor="description" className="block font-medium">Description <span className="font-normal text-slate-500">(required)</span></label>
        <Textarea id="description" name="description" placeholder="What would you like to do? What could work better?" rows={6} required maxLength={5000} aria-describedby="description-help" value={description} disabled={pending} onChange={event => setDescription(event.target.value)} />
        <p id="description-help" className="text-sm leading-relaxed text-slate-600">Please don&apos;t include passwords, recovery phrases, or personal account details.</p>
      </div>
      <Button type="submit" disabled={!canSubmit || pending} className="w-full sm:w-auto">{pending ? "Submitting…" : "Submit feedback"}</Button>
      {error && <p role="alert" className="leading-relaxed text-red-700">{error}</p>}
    </form>
  );
}
