import Link from "next/link"
import { ArrowLeft, Clock, ShieldAlert } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { initializeMockData } from "@/store/serverStore"
import { ShopDashboardClient } from "./ShopDashboardClient"
import {
  buildStorefrontCatalogSnapshot,
  type StorefrontProduct,
  type StorefrontUser,
} from "@/lib/storefrontCatalog"
import {
  buildStoredProductCatalog,
  type ProductCatalogCategory,
  type ProductCatalogRecord,
} from "@/lib/productCatalogView"
import { buildCartOwnerKey } from "@/lib/cartIdentity"

export default async function SklepPage() {
  const session = await auth()
  if (!session?.user) redirect("/logowanie")

  const { products, categories, users } = initializeMockData()
  const sessionUser = session.user as {
    id?: string
    email?: string | null
  }

  const catalogProducts = await buildStoredProductCatalog(
    products as unknown as ProductCatalogRecord[],
    categories as unknown as ProductCatalogCategory[]
  )
  const storefront = buildStorefrontCatalogSnapshot(
    catalogProducts as unknown as StorefrontProduct[],
    users as StorefrontUser[],
    sessionUser
  )

  if (storefront.status === "denied") {
    redirect("/logowanie")
  }

  if (storefront.status === "pending") {
    return <PendingApprovalView />
  }

  const cartOwnerKey = buildCartOwnerKey(sessionUser)
  if (!cartOwnerKey) redirect("/logowanie")

  const shopCategories = categories.map((category) => ({
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
  }))

  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            CEL-TRONICS · strefa partnera
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Katalog i zamówienia
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Aktualny katalog urządzeń, ceny przypisane do konta i dostępność
            magazynowa.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-[#0f1216]">
          <span className="text-slate-500">Typ konta</span>
          <strong className="ml-3 font-mono">
            {storefront.user.role === "BIZ"
              ? "PARTNER"
              : storefront.user.role === "ADMIN"
                ? "ADMIN"
                : "KLIENT"}
          </strong>
        </div>
      </header>

      <ShopDashboardClient
        initialProducts={storefront.products}
        categories={shopCategories}
        role={storefront.user.role}
        cartOwnerKey={cartOwnerKey}
      />
    </div>
  )
}

function PendingApprovalView() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0f1216]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              CEL-TRONICS · strefa partnera
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              Konto oczekuje na weryfikację
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Dane firmy zostały zapisane. Po zatwierdzeniu konta udostępnimy
              ceny i funkcje handlowe przypisane do Twojej firmy.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Status: weryfikacja danych firmy przez zespół CEL-TRONICS.
          </span>
        </div>

        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do CEL-TRONICS
        </Link>
      </div>
    </div>
  )
}
