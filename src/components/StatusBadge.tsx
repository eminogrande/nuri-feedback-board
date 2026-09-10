import { Badge } from "@/components/ui/badge";

export const statusStyles = {
  "Under Review": "border-slate-200 bg-slate-50 text-slate-700",
  Planned: "border-violet-100 bg-violet-50 text-violet-800",
  "In Progress": "border-amber-100 bg-amber-50 text-amber-900",
  Done: "border-emerald-100 bg-emerald-50 text-emerald-800",
};

export type FeedbackStatus = keyof typeof statusStyles;

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
