"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getFeedbackItems, useFeedback } from "@/lib/client-data";
import { statuses } from "@/lib/types";

export default function RoadmapPage() {
  const { data: items = [], loading, error, refresh } = useFeedback(getFeedbackItems);
  useEffect(() => { document.title = "Roadmap | Nuri Feedback"; }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A little look ahead</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Follow ideas from the first conversation to the finishing touches.</p></div>
        <Link href="/feedback" className={buttonVariants({ variant: "outline", className: "shrink-0" })}>Give feedback <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <p className="mb-8 mt-7 text-sm leading-relaxed text-slate-600">Current statuses from the Nuri feedback project. Plans may change.</p>
      {loading ? <p role="status">Loading roadmap…</p> : error ? <div className="space-y-3"><p role="alert">{error}</p><Button variant="outline" onClick={refresh}>Retry roadmap</Button></div> : <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map(status => {
          const grouped = items.filter(item => item.status === status);
          return <section key={status} aria-label={status} className="min-w-0 rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-5 pt-3"><h2><Badge>{status}</Badge></h2><span className="text-sm tabular-nums text-slate-600">{grouped.length} {grouped.length === 1 ? "idea" : "ideas"}</span></div>
            <div className="space-y-3">
              {grouped.map(item => <Card key={item.id} className="p-5"><article aria-labelledby={`feedback-${item.id}`} className="min-w-0">
                <h3 id={`feedback-${item.id}`} className="break-words text-lg font-semibold leading-snug"><Link href={`/feedback/${item.id}`} className="rounded-sm hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{item.title}</Link></h3>
                <div className="mt-4"><CategoryBadge category={item.category} /></div>
                <Link href={`/feedback/${item.id}`} className="mt-3 inline-flex min-h-12 items-center rounded-sm text-sm text-slate-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{item.votes} {item.votes === 1 ? "vote" : "votes"} · View and vote</Link>
              </article></Card>)}
              {grouped.length === 0 && <p className="p-4 text-slate-600">No ideas here yet.</p>}
            </div>
          </section>;
        })}
      </div>}
    </div>
  );
}
