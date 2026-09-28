import Link from "next/link"
import { getKnowledge } from "@/lib/knowledge/parser"
import {
  UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
  isSupportedKnowledgeUploadFilename,
  listKnowledgeUploadFiles,
} from "@/lib/knowledge/files"
import { auditCurrentKnowledgeSourceInvariants } from "@/lib/knowledge/invariants"
import { KnowledgeMaintenanceActions } from "./KnowledgeMaintenanceActions"

export default async function KnowledgeOperationsPage() {
  const store = await getKnowledge()
  const files = listKnowledgeUploadFiles()
  const report = auditCurrentKnowledgeSourceInvariants({
    store,
    files,
    retentionMs: UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
    isSupportedFilename: isSupportedKnowledgeUploadFilename,
  })

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="border-b border-[var(--ops-border)] pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-muted)]">
          Knowledge operations
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Wiedza techniczna
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ops-muted)]">
          Źródła, provenance i integralność storage. To warstwa zasilająca
          wyszukiwanie instalatora.
        </p>
      </header>

      <KnowledgeMaintenanceActions initialReport={report} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Źródła</h2>
            <span className="font-mono text-xs text-[var(--ops-muted)]">
              {store.sources.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
            {store.sources.length === 0 ? (
              <div className="p-5 text-sm text-[var(--ops-muted)]">
                Brak źródeł.
              </div>
            ) : (
              <div className="divide-y divide-[var(--ops-border)]">
                {store.sources.slice(0, 100).map((source) => (
                  <div
                    key={source}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="min-w-0 truncate font-mono text-sm">
                      {source}
                    </span>
                    <span className="text-xs text-[var(--ops-muted)]">
                      {store.processedSources.includes(source)
                        ? "przetworzone"
                        : "oczekuje / zapisane"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-5">
          <h2 className="text-sm font-semibold">Stan bazy</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-muted)]">Revision</dt>
              <dd className="font-mono font-semibold">{store.revision || 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-muted)]">Wpisy</dt>
              <dd className="font-mono font-semibold">
                {Object.keys(store.knowledge).length}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-muted)]">Pliki storage</dt>
              <dd className="font-mono font-semibold">{files.length}</dd>
            </div>
          </dl>
          <Link
            href="/admin/products"
            className="mt-6 flex min-h-11 items-center justify-center rounded-lg border border-[var(--ops-border)] px-4 text-sm font-semibold"
          >
            Otwórz katalog / import
          </Link>
        </aside>
      </div>
    </div>
  )
}
