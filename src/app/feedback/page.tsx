export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground">Give Feedback</h1>
        <p className="mt-4 text-muted">
          Help us improve Nuri by sharing your thoughts and suggestions.
        </p>
        <form className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Brief summary of your feedback"
            />
          </div>
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-foreground"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option>Feature Request</option>
              <option>Bug Report</option>
              <option>Improvement</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Tell us more about your feedback..."
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}
