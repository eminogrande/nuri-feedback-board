import { FeedbackCard, type FeedbackItem } from "@/components/FeedbackCard";
import { StatusBadge, type FeedbackStatus } from "@/components/StatusBadge";

export function RoadmapColumn({ status, description, items }: {
  status: FeedbackStatus;
  description: string;
  items: FeedbackItem[];
}) {
  return (
    <section aria-label={status} className="min-w-0 rounded-2xl bg-slate-50 p-3">
      <div className="px-2 pb-5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2><StatusBadge status={status} /></h2>
          <span className="text-sm tabular-nums text-slate-600">{items.length} {items.length === 1 ? "idea" : "ideas"}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => <FeedbackCard key={item.id} item={item} compact />)}
        {items.length === 0 && <p className="p-4 text-slate-600">No ideas here yet.</p>}
      </div>
    </section>
  );
}
