import { auth } from "@/auth"
import { redirect } from "next/navigation"
import {
  Activity,
  Calendar,
  FileText,
  HelpCircle,
  Package,
  Percent,
  ReceiptText,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react"
import { InstallerTier } from "@/components/ui/InstallerTier"
import { initializeMockData } from "@/store/serverStore"
import { isRepairTerminalStatus } from "@/lib/repairLifecycle"
import { StatCard } from "./_components/StatCard"
import { QuickActionTerminal } from "./_components/QuickActionTerminal"

type DashboardUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
  isApproved?: boolean
  nip?: string | null
  discount?: number
  tierName?: string
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  nip?: string | null
  discount?: number
  tierName?: string
}

type OrderRecord = {
  orderType?: string
  status?: string
  createdAt?: string
  totalPriceFinal?: number
  user?: { id?: string; email?: string }
}

type RepairRecord = {
  status?: string
  user?: { id?: string; email?: string }
}

function belongsTo(
  recordUser: { id?: string; email?: string } | undefined,
  sessionUser: DashboardUser
) {
  return Boolean(
    (sessionUser.id && recordUser?.id === sessionUser.id) ||
      (sessionUser.email &&
        recordUser?.email?.toLowerCase() === sessionUser.email.toLowerCase())
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const sessionUser = session?.user as DashboardUser | undefined

  if (!sessionUser || sessionUser.role !== "BIZ" || !sessionUser.isApproved) {
    redirect("/logowanie")
  }

  const { users, orders, repairs } = initializeMockData()
  const storedUser = (users as StoredUser[]).find(
    (user) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        user.email?.toLowerCase() === sessionUser.email.toLowerCase())
  )

  const ownOrders = (orders as OrderRecord[]).filter((order) =>
    belongsTo(order.user, sessionUser)
  )
  const ownRepairs = (repairs as RepairRecord[]).filter((repair) =>
    belongsTo(repair.user, sessionUser)
  )
  const activeRma = ownRepairs.filter(
    (repair) => !isRepairTerminalStatus(repair.status)
  ).length

  const currentYear = new Date().getFullYear()
  const ytdTurnover = ownOrders
    .filter((order) => {
      if (order.orderType !== "ORDER" || order.status === "CANCELLED") return false
      const date = order.createdAt ? new Date(order.createdAt) : null
      return date && !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear
    })
    .reduce((sum, order) => sum + Number(order.totalPriceFinal || 0), 0)

  const discount = Number(storedUser?.discount ?? sessionUser.discount ?? 0)
  const tierName = storedUser?.tierName || sessionUser.tierName || "BASIC"
  const companyName = storedUser?.companyName || sessionUser.name || "Partner B2B"
  const nip = storedUser?.nip || sessionUser.nip || "Brak NIP"

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <header className="flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Panel partnera B2B
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            {companyName}
          </h1>
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            NIP: {nip}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Status konta
            </span>
            <strong className="text-sm">Zweryfikowany partner B2B</strong>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-sm">
            <InstallerTier currentLevel={tierName} discount={discount} />
          </div>
        </div>
        <div className="grid gap-6 lg:col-span-4">
          <StatCard
            label={`Obroty ${currentYear}`}
            value={`${ytdTurnover.toFixed(2)} PLN`}
            subValue="Zapisane zamówienia, bez anulowanych"
            Icon={ReceiptText}
          />
          <StatCard
            label="Aktywne RMA"
            value={String(activeRma)}
            subValue="Twoje zgłoszenia niezakończone"
            Icon={Calendar}
          />
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-extrabold tracking-tight">Najczęstsze działania</h2>
        <div className="mt-6">
          <QuickActionTerminal
            actions={[
              {
                title: "Katalog B2B",
                desc: "Aktualny katalog, ceny przypisane do konta i stany magazynowe.",
                href: "/sklep",
                Icon: FileText,
                badge: "B2B",
              },
              {
                title: "Zapytanie projektowe",
                desc: "Kontakt w sprawie indywidualnej wyceny i warunków projektu.",
                href: "/kontakt",
                Icon: Zap,
              },
              {
                title: "Serwis RMA",
                desc: "Nowe zgłoszenie serwisowe i status bieżących napraw.",
                href: "/oferty/naprawy",
                Icon: Wrench,
              },
              {
                title: "Pomoc techniczna",
                desc: "Kontakt z zespołem CEL-TRONICS.",
                href: "/kontakt",
                Icon: HelpCircle,
              },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-4 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Poziom", value: tierName, icon: Package },
          { label: "Rabat konta", value: `${discount.toFixed(1)}%`, icon: Percent },
          { label: "Zamówienia", value: String(ownOrders.length), icon: ReceiptText },
          { label: "Aktywne RMA", value: String(activeRma), icon: Activity },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4">
            <item.icon className="h-5 w-5 text-primary" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <strong className="mt-1 block text-sm">{item.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
