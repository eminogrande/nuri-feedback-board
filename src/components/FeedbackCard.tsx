import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryBadge, type Category } from "@/components/CategoryBadge";
import { StatusBadge, type FeedbackStatus } from "@/components/StatusBadge";
import { VoteButton } from "@/components/VoteButton";

export type FeedbackItem = {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: FeedbackStatus;
  votes: number;
  comments: number;
};

export function FeedbackCard({ item, compact = false }: { item: FeedbackItem; compact?: boolean }) {
  return (
    <Card className="p-5 transition-colors hover:border-slate-300">
      <article aria-labelledby={`feedback-${item.id}`} className="flex min-w-0 items-start gap-4">
        {!compact && <VoteButton count={item.votes} title={item.title} />}
        <div className="min-w-0 flex-1">
          <h3 id={`feedback-${item.id}`} className="break-words text-lg font-semibold leading-snug">
            <Link href={`/feedback/${item.id}`} className="rounded-sm hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
              {item.title}
            </Link>
          </h3>
          {!compact && <p className="mt-2 break-words leading-relaxed text-slate-600">{item.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CategoryBadge category={item.category} />
            {!compact && <StatusBadge status={item.status} />}
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
            {compact && <VoteButton count={item.votes} title={item.title} />}
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle aria-hidden="true" className="size-4" />
              {item.comments} {item.comments === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>
      </article>
    </Card>
  );
}
