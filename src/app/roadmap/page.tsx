import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RoadmapColumn } from "@/components/RoadmapColumn";
import type { FeedbackItem } from "@/components/FeedbackCard";
import type { FeedbackStatus } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Roadmap" };

const items: FeedbackItem[] = [
  { id: "101", title: "Add a home screen balance widget", description: "A quick way to check my balance without opening the app.", category: "feature", status: "Under Review", votes: 42, comments: 8 },
  { id: "102", title: "Make transaction search more useful", description: "Find a payment by the recipient, amount, or a note I added.", category: "improvement", status: "Planned", votes: 36, comments: 5 },
  { id: "103", title: "Show a clearer payment confirmation", description: "Make it easier to tell when a payment is complete and share the receipt.", category: "improvement", status: "In Progress", votes: 28, comments: 4 },
  { id: "104", title: "Fix the keyboard covering the amount field", description: "On smaller screens, the keyboard can hide the amount while making a payment.", category: "bug", status: "Done", votes: 19, comments: 3 },
  { id: "105", title: "Save my favourite recipients", description: "Keep the people I pay most often close at hand.", category: "feature", status: "Planned", votes: 24, comments: 2 },
  { id: "106", title: "Keep the selected currency after reopening", description: "The balance display sometimes resets to the default currency when I reopen the app.", category: "bug", status: "Under Review", votes: 12, comments: 1 },
];

const columns: { status: FeedbackStatus; description: string }[] = [
  { status: "Under Review", description: "Listening, learning, and exploring." },
  { status: "Planned", description: "Ideas we would like to take forward." },
  { status: "In Progress", description: "Taking shape, one step at a time." },
  { status: "Done", description: "Improvements brought to life." },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A little look ahead</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Follow ideas from the first conversation to the finishing touches.</p></div>
        <Link href="/feedback" className={buttonVariants({ variant: "outline", className: "shrink-0" })}>Give feedback <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <p className="mb-8 mt-7 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-950">Sample roadmap · These items demonstrate the board, not confirmed plans or shipped features. Preview votes are not saved.</p>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ status, description }) => <RoadmapColumn key={status} status={status} description={description} items={items.filter((item) => item.status === status)} />)}
      </div>
    </div>
  );
}
