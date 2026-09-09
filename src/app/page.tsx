import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
        Shape the future of Nuri
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">
        Share your feedback, vote on features, and see what we&apos;re building next.
      </p>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/feedback"
          className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
        >
          Give Feedback
        </Link>
        <Link
          href="/roadmap"
          className="rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/10 transition-colors"
        >
          View Roadmap
        </Link>
      </div>
    </div>
  );
}
