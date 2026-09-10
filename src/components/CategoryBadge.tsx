import { Bug, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const categories = {
  feature: { label: "Feature request", icon: Lightbulb, className: "border-violet-100 bg-violet-50 text-violet-800" },
  bug: { label: "Bug report", icon: Bug, className: "border-rose-100 bg-rose-50 text-rose-800" },
  improvement: { label: "Improvement", icon: Sparkles, className: "border-sky-100 bg-sky-50 text-sky-800" },
};

export type Category = keyof typeof categories;

export function isCategory(value: string | undefined): value is Category {
  return value === "feature" || value === "bug" || value === "improvement";
}

export function CategoryBadge({ category }: { category: Category }) {
  const { label, icon: Icon, className } = categories[category];
  return <Badge className={className}><Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}</Badge>;
}
