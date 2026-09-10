"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { CategoryBadge, categories, isCategory } from "@/components/CategoryBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFeedbackItems, useFeedback } from "@/lib/client-data";
import { cn } from "@/lib/utils";

function Board() {
  const params = useSearchParams();
  const selected = params.get("category") ?? "";
  const category = isCategory(selected) ? selected : undefined;
  const query = params.get("q") ?? "";
  const { data: items = [], loading, error, refresh } = useFeedback(getFeedbackItems);
  const term = query.trim().toLowerCase();
  const filtered = items.filter(item => (!category || item.category === category) && `${item.title} ${item.body}`.toLowerCase().includes(term));
  useEffect(() => { document.title = "Feedback board | Nuri Feedback"; }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Feedback board</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Ideas, small improvements, and things we can do better. Find what matters to you.</p>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-labelledby="feedback-items-heading" className="min-w-0" aria-busy={loading}>
          <h2 id="feedback-items-heading" className="sr-only">Community feedback</h2>
          <nav aria-label="Feedback categories" className="flex flex-wrap gap-2">
            {[{ value: "", label: "All feedback" }, ...Object.entries(categories).map(([value, { label }]) => ({ value, label }))].map(({ value, label }) => {
              const active = value === (category ?? "");
              const search = new URLSearchParams();
              if (value) search.set("category", value);
              if (query) search.set("q", query);
              return <Link key={value} href={`/board${search.size ? `?${search}` : ""}`} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-12 items-center rounded-xl border px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2", active ? "border-violet-200 bg-violet-50 text-violet-900" : "border-border text-slate-600 hover:bg-slate-50")}>{label}</Link>;
            })}
          </nav>
          <form action="/board" method="get" role="search" className="mt-5 flex flex-wrap gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative min-w-0 flex-1 basis-48">
              <label htmlFor="feedback-search" className="sr-only">Search feedback</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-4 size-5 text-slate-500" />
              <Input key={`${category}-${query}`} id="feedback-search" name="q" type="search" placeholder="Search ideas and feedback" defaultValue={query} className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          {loading ? <p role="status" className="my-5">Loading feedback…</p> : error ? <div className="my-5 space-y-3"><p role="alert">{error}</p><Button variant="outline" onClick={refresh}>Retry feedback</Button></div> : <>
            <p className="my-5 text-sm text-slate-600" role="status">{filtered.length} {filtered.length === 1 ? "idea" : "ideas"}{category ? ` · ${categories[category].label}` : ""}</p>
            <div className="space-y-4">
              {filtered.map(item => <Card key={item.id} className="p-5 transition-colors hover:border-slate-300">
                <article aria-labelledby={`feedback-${item.id}`} className="min-w-0">
                  <h3 id={`feedback-${item.id}`} className="break-words text-lg font-semibold leading-snug"><Link href={`/feedback/${item.id}`} className="rounded-sm hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{item.title}</Link></h3>
                  <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-600">{item.body}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2"><CategoryBadge category={item.category} /><Badge>{item.status}</Badge><Link href={`/feedback/${item.id}`} className="inline-flex min-h-12 items-center rounded-sm px-2 text-sm text-slate-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{item.votes} {item.votes === 1 ? "vote" : "votes"} · View and vote</Link></div>
                </article>
              </Card>)}
              {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><h2 className="text-xl font-semibold">{items.length ? "No matching ideas" : "No feedback yet"}</h2><p className="mt-3 leading-relaxed text-slate-600">Try a different search, or start a new conversation.</p><Link href="/board" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>Clear filters</Link></div>}
            </div>
          </>}
        </section>
        <aside className="sticky top-4 z-10 order-first rounded-2xl border border-border bg-white p-4 shadow-sm lg:order-last lg:top-6 lg:p-6">
          <h2 className="hidden text-lg font-semibold lg:block">Your perspective matters</h2>
          <p className="mb-5 mt-3 hidden leading-relaxed text-slate-600 lg:block">Missing something? Share an idea, report a bug, or suggest a better way.</p>
          <Link href={category ? `/feedback?category=${category}` : "/feedback"} className={cn(buttonVariants(), "w-full")}><Plus aria-hidden="true" className="size-5" />Give feedback</Link>
        </aside>
      </div>
    </div>
  );
}

export default function BoardPage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading feedback…</p>}><Board /></Suspense>;
}
