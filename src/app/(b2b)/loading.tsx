export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px] items-center gap-4 border-b border-slate-200 px-4 last:border-b-0 dark:border-slate-800"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        ))}
      </div>
    </div>
  )
}
