import Link from "next/link";
import { ArrowRight, Bug, Lightbulb, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section className="pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
        <p className="mb-6 inline-flex rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900">Your ideas. A better Nuri.</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Help shape Nuri</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">A small idea can make a big difference. Share what&apos;s on your mind, support ideas you love, and see what comes next.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/feedback" className={buttonVariants()}>Give feedback <ArrowRight aria-hidden="true" className="size-5" /></Link>
          <Link href="/roadmap" className={buttonVariants({ variant: "outline" })}>View roadmap</Link>
        </div>
        <Link href="/board" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-md text-base font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">Or explore the feedback board <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </section>

      <section aria-labelledby="share-heading">
        <h2 id="share-heading" className="text-2xl font-semibold tracking-tight">What&apos;s on your mind?</h2>
        <p className="mt-3 leading-relaxed text-slate-600">There&apos;s no wrong place to start.</p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { category: "feature", title: "Have an idea?", description: "Tell us what you wish Nuri could do. The next useful feature could start with you.", icon: Lightbulb, style: "bg-violet-50 text-violet-800", label: "Request a feature" },
            { category: "bug", title: "Found a bug?", description: "Something not working as expected? Help us understand what happened.", icon: Bug, style: "bg-rose-50 text-rose-800", label: "Report a bug" },
            { category: "improvement", title: "Make it better", description: "A simpler step, a clearer screen, a little less friction. Small improvements count.", icon: Sparkles, style: "bg-sky-50 text-sky-800", label: "Suggest an improvement" },
          ].map(({ category, title, description, icon: Icon, style, label }) => (
            <Link key={category} href={`/feedback?category=${category}`} className="group flex min-w-0 flex-col rounded-2xl border border-border p-6 transition-colors hover:border-violet-300 hover:bg-violet-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
              <span className={`mb-5 flex size-12 items-center justify-center rounded-xl ${style}`}><Icon aria-hidden="true" className="size-6" /></span>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mb-6 mt-3 flex-1 leading-relaxed text-slate-600">{description}</p>
              <span className="flex items-center gap-2 text-base font-medium">{label}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="my-16 rounded-2xl bg-slate-50 p-6 sm:my-20 sm:p-10">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            { title: "Share your perspective", description: "Describe the idea or problem, and why it matters to you." },
            { title: "Find your people", description: "Browse the board and support the ideas you would find useful." },
            { title: "Follow along", description: "See ideas move from review to planned, in progress, and done." },
          ].map(({ title, description }, index) => (
            <li key={title}>
              <span aria-hidden="true" className="mb-4 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold">{index + 1}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{description}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-600">You&apos;re exploring a UI preview. Board items are examples; sign-in, submissions, and saved votes are coming later.</p>
      </section>
    </div>
  );
}
