"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1">
      {[
        { href: "/board", label: "Board" },
        { href: "/roadmap", label: "Roadmap" },
        { href: "/feedback", label: "Feedback" },
      ].map(({ href, label }) => {
        const active = pathname === href;
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-lg px-2 py-3 text-base font-medium text-slate-600 sm:px-3 hover:bg-slate-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700", active && "bg-violet-50 text-violet-900")}>{label}</Link>;
      })}
    </nav>
  );
}
