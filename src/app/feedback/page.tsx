import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isCategory } from "@/components/CategoryBadge";
import { SubmitForm } from "@/components/SubmitForm";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Give feedback" };

export default async function FeedbackPage({ searchParams }: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === "string" && isCategory(params.category) ? params.category : "feature";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/board" className="inline-flex min-h-12 items-center gap-2 rounded-md text-base text-slate-600 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"><ArrowLeft aria-hidden="true" className="size-4" />Back to the board</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Give feedback</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">What would make Nuri work better for you? We&apos;re listening.</p>
      <p className="mt-4 leading-relaxed text-slate-600">Before you start, <Link href="/board" className="rounded-sm text-violet-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">check the board</Link> to see if someone has shared a similar idea.</p>
      <Card className="mt-8 p-5 sm:p-8"><SubmitForm key={category} initialCategory={category} /></Card>
    </div>
  );
}
