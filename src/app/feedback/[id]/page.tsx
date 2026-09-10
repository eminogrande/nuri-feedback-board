"use client";

import Link from "next/link";
import { use, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { FeedbackVote } from "@/components/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFeedbackItem, useFeedback } from "@/lib/client-data";

type Props = { params: Promise<{ id: string }> };

export default function FeedbackDetailPage({ params }: Props) {
  const { id } = use(params);
  return <FeedbackDetail key={id} id={id} />;
}

function FeedbackDetail({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => getFeedbackItem(id, signal), [id]);
  const { data: item, loading, error, refresh } = useFeedback(load);
  useEffect(() => {
    document.title = `${item?.title ?? (item === null ? "Feedback not found" : "Feedback")} | Nuri Feedback`;
  }, [item]);

  if (item === null) return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-medium text-slate-500">404 · Feedback not found</p>
      <h1 className="mt-4 text-3xl font-semibold">This idea isn&apos;t on the board</h1>
      <p className="my-6 leading-relaxed text-slate-600">The link may be incorrect. Browse the board to find another idea.</p>
      <Link href="/board" className={buttonVariants()}>Back to the board</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/board" className="inline-flex min-h-12 items-center gap-2 rounded-md text-base text-slate-600 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"><ArrowLeft aria-hidden="true" className="size-4" />Back to the board</Link>
      {loading ? <p role="status" className="mt-6">Loading feedback…</p> : error ? <div className="mt-6 space-y-3"><h1 className="text-3xl font-semibold">Feedback unavailable</h1><p role="alert">{error}</p><Button variant="outline" onClick={refresh}>Retry feedback</Button></div> : item && <>
        <p className="mb-6 mt-5 text-sm leading-relaxed text-slate-600">Feedback #{item.number} · Submitted by <span className="break-all">{item.author}</span> (display name)</p>
        <Card className="p-5 sm:p-8">
          <div className="mb-5 flex flex-wrap gap-2"><CategoryBadge category={item.category} /><Badge>{item.status}</Badge></div>
          <h1 className="break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{item.title}</h1>
          <p className="mt-6 whitespace-pre-wrap break-words text-lg leading-relaxed text-slate-600">{item.body}</p>
          <div className="mt-8 border-t border-border pt-6"><FeedbackVote key={item.id} id={item.id} count={item.votes} title={item.title} onVoted={refresh} /></div>
        </Card>
      </>}
    </div>
  );
}
