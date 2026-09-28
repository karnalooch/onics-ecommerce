import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

const migratedScreens = [
  "src/app/admin/clients/page.tsx",
  "src/app/admin/orders/page.tsx",
  "src/app/admin/payments/page.tsx",
  "src/app/admin/quotes/page.tsx",
  "src/app/admin/price-lists/page.tsx",
  "src/app/admin/categories/CategoriesDashboardClient.tsx",
  "src/app/admin/repairs/RepairsDashboardClient.tsx",
  "src/app/admin/products/_components/AICommandCenter.tsx",
  "src/app/admin/products/_components/StagingDashboard.tsx",
  "src/app/admin/products/_components/ProductHeader.tsx",
  "src/app/admin/products/_components/ProductSidebar.tsx",
  "src/app/admin/products/_components/StructureApprovalModal.tsx",
  "src/app/admin/products/_components/StagingBatchActions.tsx",
  "src/components/ui/B2BDashboardGrid.tsx",
  "src/components/ui/QuoteRequestModal.tsx",
  "src/app/(b2b)/oferty/page.tsx",
  "src/app/(b2b)/oferty/zamowienia/page.tsx",
  "src/app/(b2b)/oferty/naprawy/page.tsx",
  "src/app/(b2b)/ustawienia/page.tsx",
]

const forbiddenPresentationTokens = [
  "MISSION_CONTROL_MATRIX",
  "Blueprint_Gen_v9",
  "B2B_Identity_Registry",
  "DHL_FLOW_LOGISTICS",
  "TRANSACTION_QUEUE_STREAM",
  "STAGING_TERMINAL",
  "NODE_SELECTED",
  "REJESTR_WĘZŁÓW_GŁÓWNYCH",
  "Diagnostic_v9",
  "CRT v4.6_PRO",
  "Systemowy Węzeł Ewidencji",
  "Filtrowanie IQ",
  "Wątki Katalogowe",
  "Universal Structure Hub",
  "MASOWA_AUTORYZACJA",
  "Masowy katalog sprzętowy V2",
  "bazy hybrydowej",
  "Centrum RMA",
]

describe("admin UI language contract", () => {
  it("keeps migrated operational screens free of legacy command-center copy", () => {
    const content = migratedScreens
      .map((screen) => read(screen))
      .join("\n")

    for (const token of forbiddenPresentationTokens) {
      expect(content).not.toContain(token)
    }
  })

  it("keeps primary product row actions visible without hover-only discovery", () => {
    const row = read(
      "src/app/admin/products/_components/ProductTableRow.tsx"
    )

    expect(row).not.toContain(
      "opacity-0 group-hover/row:opacity-100"
    )
    expect(row).toContain("Edytuj")
    expect(row).toContain("Usuń produkt")
  })

  it("keeps product detail inside the shared admin shell", () => {
    const detail = read("src/app/admin/products/[id]/page.tsx")

    expect(detail).not.toContain("admin-sidebar")
    expect(detail).not.toContain("System Zarządzania")
    expect(detail).not.toContain('src="/assets/logo.png"')
  })

  it("keeps admin loading states task-shaped instead of dashboard-shaped", () => {
    const loading = read("src/app/admin/loading.tsx")
    const repairsLoading = read("src/app/admin/repairs/loading.tsx")

    expect(loading).not.toContain("rounded-[2rem]")
    expect(repairsLoading).not.toContain("Ładowanie Panelu")
    expect(repairsLoading).not.toContain("Synchronizacja danych")
  })
})
