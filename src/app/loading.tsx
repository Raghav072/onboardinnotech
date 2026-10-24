export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Loading</span>
      <div className="h-10 w-64 rounded-tile bg-line" />
      <div className="h-4 w-96 max-w-full rounded-tile bg-line" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 rounded-card bg-line" />
        ))}
      </div>
    </div>
  );
}
