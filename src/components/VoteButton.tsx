"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoteButton({ count, title }: { count: number; title: string }) {
  const [voted, setVoted] = useState(false);

  return (
    <Button
      variant="outline"
      className={cn("min-w-14 shrink-0 flex-col gap-0 px-3 py-2 leading-tight", voted && "border-violet-400 bg-violet-50 text-violet-800")}
      aria-label={`${voted ? "Remove preview vote for" : "Preview an upvote for"} ${title}`}
      aria-pressed={voted}
      title="Preview only. Votes are not saved."
      onClick={() => setVoted(!voted)}
    >
      <ChevronUp aria-hidden="true" className="size-5" />
      <span aria-live="polite" aria-atomic="true">{count + (voted ? 1 : 0)}</span>
    </Button>
  );
}
