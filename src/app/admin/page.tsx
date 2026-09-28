import Link from "next/link"
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react"
import AdminActions from "./AdminActions"
import { initializeMockData } from "@/store/serverStore"
import { isQuoteAdminActionable } from "@/lib/quoteAdmin"
import { isRepairTerminalStatus } from "@/lib/repairLifecycle"
import { getKnowledge } from "@/lib/knowledge/parser"
import {
  UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
  isSupportedKnowledgeUploadFilename,
  listKnowledgeUploadFiles,
} from "@/lib/knowledge/files"
import { auditKnowledgeSourceInvariants } from "@/lib/knowledge/invariants"

async function readKnowledgeStatus() {
  try {
    const store = await getKnowledge()
    const files = listKnowledgeUploadFiles()
    const report = auditKnowledgeSourceInvariants({
      store,
      files,
      now: Date.now(),
      retentionMs: UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
      isSupportedFilename: isSupportedKnowledgeUploadFilename,
    })

    return {
      available: true,
      sourceCount: store.sources.length,
      entryCount: Object.keys(store.knowledge).length,
      report,
    }
  } catch {
    return { available: false, sourceCount: 0, entryCount: 0, report: null }
  }
}

export default async function AdminDashboard() {
  const { users, orders, repairs, products } = initializeMockData()
  const knowledge = await readKnowledgeStatus()

  const unapprovedUsers = users.filter(
    (user: any) => user.roleType === "BIZ" && !user.isApproved
  )
  const pendingQuotes = orders.filter((order: any) =>
    isQuoteAdminActionable(order.status)
  )
  const activeRepairs = repairs.filter(
    (repair: any) => !isRepairTerminalStatus(repair.status)
  )
  const unpricedProducts = products.filter(
    (product: any) =>
      !Number.isFinite(Number(product.price)) || Number(product.price) <= 0
  )
  const incompleteProducts = products.filter(
    (product: any) =>
      !String(product.sku || "").trim() ||
      !String(product.name || "").trim() ||
      !String(product.manufacturer || "").trim() ||
      !product.categoryId
  )

  const knowledgeProblems = knowledge.report
    ? knowledge.report.danglingReferences.length +
      knowledge.report.staleOrphans.length +
      knowledge.report.ambiguousLegacyFiles.length +
      knowledge.report.unsupportedFiles.length
    : 1

  const signals = [
    {
      label: "Konta do weryfikacji",
      value: unapprovedUsers.length,
      href: "/admin/clients",
      icon: Users,
      critical: unapprovedUsers.length > 0,
      detail: "Partnerzy oczekujący na decyzję administratora.",
    },
    {
      label: "Aktywne zgłoszenia serwisowe",
      value: activeRepairs.length,
      href: "/admin/repairs",
      icon: Wrench,
      critical: activeRepairs.length > 0,
      detail: "RMA i naprawy, które nie osiągnęły stanu końcowego.",
    },
    {
      label: "Oferty wymagające działania",
      value: pendingQuotes.length,
      href: "/admin/quotes",
      icon: FileText,
      critical: pendingQuotes.length > 0,
      detail: "Wyceny w stanie wymagającym obsługi operatora.",
    },
    {
      label: "Problemy jakości katalogu",
      value: unpricedProducts.length + incompleteProducts.length,
      href: "/admin/products",
      icon: Boxes,
      critical: unpricedProducts.length + incompleteProducts.length > 0,
      detail:
        String(unpricedProducts.length) +
        " bez ceny · " +
        String(incompleteProducts.length) +
        " niekompletnych",
    },
    {
      label: "Integralność bazy wiedzy",
      value: knowledgeProblems,
      href: "/admin/knowledge",
      icon: BookOpen,
      critical: knowledgeProblems > 0,
      detail: knowledge.available
        ? String(knowledge.sourceCount) +
          " źródeł · " +
          String(knowledge.entryCount) +
          " wpisów"
        : "Nie udało się odczytać stanu storage.",
    },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-muted)]">
            Centrum operacyjne
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Operacje
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-muted)]">
            Rzeczy wymagające reakcji. Bez wykresów sprzedażowych i bez dekoracyjnych KPI.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {knowledge.available && knowledgeProblems === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              System spójny
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Wymaga uwagi
            </>
          )}
        </div>
      </header>

      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="attention-heading" className="text-sm font-semibold">
            Kolejka uwagi
          </h2>
          <span className="text-xs text-[var(--ops-muted)]">
            Najpierw rzeczy blokujące pracę
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
          {signals.map((signal) => {
            const Icon = signal.icon
            const badgeClass = signal.critical
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-[var(--ops-border)]"

            return (
              <Link
                key={signal.label}
                href={signal.href}
                className="grid min-h-20 gap-3 border-b border-[var(--ops-border)] px-4 py-4 last:border-b-0 hover:bg-slate-50 dark:hover:bg-white/[0.03] sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center"
              >
                <Icon className="h-5 w-5 text-[var(--ops-muted)]" />
                <div className="min-w-0">
                  <div className="font-semibold">{signal.label}</div>
                  <div className="mt-1 text-sm text-[var(--ops-muted)]">
                    {signal.detail}
                  </div>
                </div>
                <div className={"min-w-12 rounded-lg border px-3 py-2 text-center font-mono text-lg font-semibold " + badgeClass}>
                  {signal.value}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Partnerzy do weryfikacji</h2>
            <Link href="/admin/clients" className="text-sm font-semibold text-primary">
              Pełny rejestr
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
            {unapprovedUsers.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center gap-3 px-5 text-sm text-[var(--ops-muted)]">
                <ShieldCheck className="h-5 w-5" />
                Brak kont oczekujących na decyzję.
              </div>
            ) : (
              <div className="divide-y divide-[var(--ops-border)]">
                {unapprovedUsers.slice(0, 6).map((user: any) => (
                  <div
                    key={user.id}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {user.companyName || user.username || user.email}
                      </div>
                      <div className="mt-1 truncate text-sm text-[var(--ops-muted)]">
                        {user.email || user.username}
                      </div>
                    </div>
                    <div className="font-mono text-sm text-[var(--ops-muted)]">
                      {user.nip || "Brak NIP"}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <AdminActions
                        actionType="approveUser"
                        userId={user.id}
                        userRevision={Number(user.revision ?? 0)}
                      />
                      <AdminActions
                        actionType="deleteUser"
                        userId={user.id}
                        userRevision={Number(user.revision ?? 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Stan techniczny</h2>
          <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-5">
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--ops-muted)]">Indeksy katalogowe</dt>
                <dd className="font-mono font-semibold">{products.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--ops-muted)]">Źródła wiedzy</dt>
                <dd className="font-mono font-semibold">{knowledge.sourceCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--ops-muted)]">Wpisy wiedzy</dt>
                <dd className="font-mono font-semibold">{knowledge.entryCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--ops-muted)]">Aktywny serwis</dt>
                <dd className="font-mono font-semibold">{activeRepairs.length}</dd>
              </div>
            </dl>
            <Link
              href="/field"
              className="mt-6 flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              Sprawdź widok instalatora
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
