export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="border-b border-[var(--ops-border)] pb-6">
        <div className="skeleton-allow-pulse h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-allow-pulse mt-3 h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="skeleton-allow-pulse mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div
            key={row}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px_100px] items-center gap-4 border-b border-[var(--ops-border)] px-4 last:border-b-0"
          >
            <div className="skeleton-allow-pulse h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="skeleton-allow-pulse h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="skeleton-allow-pulse h-8 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        ))}
      </div>
    </div>
  )
}
