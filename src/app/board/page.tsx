export default function BoardPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground">Feedback Board</h1>
        <p className="mt-4 text-muted">
          Browse all feedback items. Data will be synced from GitHub soon.
        </p>
        <div className="mt-12 rounded-lg border border-border bg-background p-6">
          <p className="text-muted">No feedback items yet. Check back soon.</p>
        </div>
      </div>
    </div>
  );
}
