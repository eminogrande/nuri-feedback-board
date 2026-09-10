"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { categories, type Category } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SubmitForm({ initialCategory = "feature" }: { initialCategory?: Category }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // This UI packet does not create issues or authenticate users.
    if (canSubmit) setPreviewSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Give feedback">
      <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-violet-950" id="sign-in-notice">
        <LockKeyhole aria-hidden="true" className="mt-1 size-5 shrink-0" />
        <p className="leading-relaxed">Sign-in with your Nuri passkey is coming soon. This is a preview: feedback is not sent or saved.</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="category" className="block font-medium">Category</label>
        <select id="category" name="category" defaultValue={initialCategory} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
          {Object.entries(categories).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="title" className="block font-medium">Title <span className="font-normal text-slate-500">(required)</span></label>
        <Input id="title" name="title" placeholder="A short, clear summary" required maxLength={180} value={title} onChange={(event) => { setTitle(event.target.value); setPreviewSubmitted(false); }} />
      </div>
      <div className="space-y-2">
        <label htmlFor="description" className="block font-medium">Description <span className="font-normal text-slate-500">(required)</span></label>
        <Textarea id="description" name="description" placeholder="What would you like to do? What could work better?" rows={6} required maxLength={5000} aria-describedby="description-help" value={description} onChange={(event) => { setDescription(event.target.value); setPreviewSubmitted(false); }} />
        <p id="description-help" className="text-sm leading-relaxed text-slate-600">Please don&apos;t include passwords, recovery phrases, or personal account details.</p>
      </div>
      <Button type="submit" disabled={!canSubmit} aria-describedby="sign-in-notice" className="w-full sm:w-auto">Submit feedback</Button>
      <p role="status" className="leading-relaxed text-slate-700">
        {previewSubmitted ? "Preview complete. Nothing was submitted or saved. Your text remains here while this page is open; sign-in will be needed to send it when available." : ""}
      </p>
    </form>
  );
}
