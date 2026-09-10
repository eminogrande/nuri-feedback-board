export default function RoadmapPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground">Roadmap</h1>
        <p className="mt-4 text-muted">
          See what we&apos;re working on and what&apos;s coming next. Data will be synced from our GitHub project soon.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {["Planned", "In Progress", "Completed"].map((status) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-background p-6"
            >
              <h2 className="text-lg font-semibold text-foreground">{status}</h2>
              <p className="mt-2 text-sm text-muted">
                No items yet. Check back soon.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
