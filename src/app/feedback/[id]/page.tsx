import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { VoteButton } from "@/components/VoteButton";
import type { FeedbackItem } from "@/components/FeedbackCard";
import { Card } from "@/components/ui/card";

const items: Record<string, FeedbackItem> = {
  "101": { id: "101", title: "Add a home screen balance widget", description: "A quick way to check my balance without opening the app.", category: "feature", status: "Under Review", votes: 42, comments: 8 },
  "102": { id: "102", title: "Make transaction search more useful", description: "Find a payment by the recipient, amount, or a note I added.", category: "improvement", status: "Planned", votes: 36, comments: 5 },
  "103": { id: "103", title: "Show a clearer payment confirmation", description: "Make it easier to tell when a payment is complete and share the receipt.", category: "improvement", status: "In Progress", votes: 28, comments: 4 },
  "104": { id: "104", title: "Fix the keyboard covering the amount field", description: "On smaller screens, the keyboard can hide the amount while making a payment.", category: "bug", status: "Done", votes: 19, comments: 3 },
  "105": { id: "105", title: "Save my favourite recipients", description: "Keep the people I pay most often close at hand.", category: "feature", status: "Planned", votes: 24, comments: 2 },
  "106": { id: "106", title: "Keep the selected currency after reopening", description: "The balance display sometimes resets to the default currency when I reopen the app.", category: "bug", status: "Under Review", votes: 12, comments: 1 },
};

type Props = { params: Promise<{ id: string }> };

function getItem(id: string) {
  if (!Object.hasOwn(items, id)) notFound();
  return items[id];
}

export function generateStaticParams() {
  return Object.keys(items).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getItem((await params).id).title };
}

export default async function FeedbackDetailPage({ params }: Props) {
  const item = getItem((await params).id);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/board" className="inline-flex min-h-12 items-center gap-2 rounded-md text-base text-slate-600 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"><ArrowLeft aria-hidden="true" className="size-4" />Back to the board</Link>
      <p className="mb-6 mt-5 text-sm leading-relaxed text-slate-600">Example feedback #{item.id} · This is sample content. Preview votes are not saved.</p>
      <Card className="p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap gap-2"><CategoryBadge category={item.category} /><StatusBadge status={item.status} /></div>
        <h1 className="break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{item.title}</h1>
        <p className="mt-6 break-words text-lg leading-relaxed text-slate-600">{item.description}</p>
        <div className="mt-8 flex items-center gap-4 border-t border-border pt-6"><VoteButton count={item.votes} title={item.title} /><p className="leading-relaxed text-slate-600">Would this help you too?<br /><span className="text-sm">Try an upvote in this preview.</span></p></div>
      </Card>
      <section className="mt-8" aria-labelledby="discussion-heading">
        <h2 id="discussion-heading" className="flex items-center gap-2 text-xl font-semibold"><MessageCircle aria-hidden="true" className="size-5" />Discussion <span className="text-base font-normal text-slate-500">({item.comments} sample {item.comments === 1 ? "comment" : "comments"})</span></h2>
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 leading-relaxed text-slate-600">Discussion will appear here when the live board is connected. Sign-in and commenting are not available in this preview.</p>
      </section>
    </div>
  );
}
