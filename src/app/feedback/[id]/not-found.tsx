import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function FeedbackNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-medium text-slate-500">404 · Feedback not found</p>
      <h1 className="mt-4 text-3xl font-semibold">This idea isn&apos;t on the board</h1>
      <p className="my-6 leading-relaxed text-slate-600">The link may be incorrect. Browse the sample board to find another idea.</p>
      <Link href="/board" className={buttonVariants()}>Back to the board</Link>
    </div>
  );
}
