import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { FeedbackCard, type FeedbackItem } from "@/components/FeedbackCard";
import { categories, isCategory } from "@/components/CategoryBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Feedback board" };

// Static examples are intentionally local until the data integration packet lands.
const items: FeedbackItem[] = [
  { id: "101", title: "Add a home screen balance widget", description: "A quick way to check my balance without opening the app.", category: "feature", status: "Under Review", votes: 42, comments: 8 },
  { id: "102", title: "Make transaction search more useful", description: "Find a payment by the recipient, amount, or a note I added.", category: "improvement", status: "Planned", votes: 36, comments: 5 },
  { id: "103", title: "Show a clearer payment confirmation", description: "Make it easier to tell when a payment is complete and share the receipt.", category: "improvement", status: "In Progress", votes: 28, comments: 4 },
  { id: "104", title: "Fix the keyboard covering the amount field", description: "On smaller screens, the keyboard can hide the amount while making a payment.", category: "bug", status: "Done", votes: 19, comments: 3 },
  { id: "105", title: "Save my favourite recipients", description: "Keep the people I pay most often close at hand.", category: "feature", status: "Planned", votes: 24, comments: 2 },
  { id: "106", title: "Keep the selected currency after reopening", description: "The balance display sometimes resets to the default currency when I reopen the app.", category: "bug", status: "Under Review", votes: 12, comments: 1 },
];

export default async function BoardPage({ searchParams }: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === "string" && isCategory(params.category) ? params.category : undefined;
  const query = typeof params.q === "string" ? params.q : "";
  const term = query.trim().toLowerCase();
  const filtered = items.filter((item) => (!category || item.category === category) && `${item.title} ${item.description}`.toLowerCase().includes(term));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Feedback board</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Ideas, small improvements, and things we can do better. Find what matters to you.</p>
      <p className="mt-5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-950">Sample board · These are example ideas, not product commitments. Preview votes are not saved.</p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-label="Feedback items" className="min-w-0">
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
          <p className="my-5 text-sm text-slate-600">{filtered.length} {filtered.length === 1 ? "idea" : "ideas"}{category ? ` · ${categories[category].label}` : ""}</p>
          <div className="space-y-4">
            {filtered.map((item) => <FeedbackCard key={item.id} item={item} />)}
            {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><h2 className="text-xl font-semibold">No matching ideas</h2><p className="mt-3 leading-relaxed text-slate-600">Try a different search, or start a new conversation.</p><Link href="/board" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>Clear filters</Link></div>}
          </div>
        </section>
        <aside className="sticky bottom-4 z-10 rounded-2xl border border-border bg-white p-4 shadow-sm lg:top-6 lg:bottom-auto lg:p-6">
          <h2 className="hidden text-lg font-semibold lg:block">Your perspective matters</h2>
          <p className="mb-5 mt-3 hidden leading-relaxed text-slate-600 lg:block">Missing something? Share an idea, report a bug, or suggest a better way.</p>
          <Link href={category ? `/feedback?category=${category}` : "/feedback"} className={cn(buttonVariants(), "w-full")}><Plus aria-hidden="true" className="size-5" />Give feedback</Link>
        </aside>
      </div>
    </div>
  );
}
