import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

const publicBrandSurfaces = [
  "src/components/ui/IconicNav.tsx",
  "src/app/logowanie/page.tsx",
  "src/app/rejestracja/page.tsx",
  "src/app/rejestracja/_components/PartnerRegistrationForm.tsx",
  "src/app/sklep/page.tsx",
  "src/app/sklep/ShopDashboardClient.tsx",
  "src/app/sklep/_components/ShopSidebar.tsx",
  "src/app/sklep/_components/ProductGrid.tsx",
  "src/app/sklep/_components/ProductCard.tsx",
  "src/app/sklep/_components/MiniCart.tsx",
  "src/app/uslugi/page.tsx",
]

const forbiddenPublicTokens = [
  "OnboardingMissionControl",
  "Mission Control",
  "Celtronics Pro",
  "Preview Model",
  "Pusty Magazynek",
  "Modern Retail & B2B Shop",
  "Premium Styling",
  "Finalizuj Wybór",
  "Klient Detaliczny",
]

describe("CEL-TRONICS public brand contract", () => {
  it("keeps public product surfaces CEL-TRONICS-first", () => {
    const content = publicBrandSurfaces.map((screen) => read(screen)).join("\n")

    expect(content).toContain("CEL-TRONICS")
    expect(read("src/components/ui/IconicNav.tsx")).toContain("/assets/logo.svg")
    expect(read("src/app/logowanie/page.tsx")).toContain(
      "CEL-TRONICS · strefa partnera"
    )
    expect(read("src/app/sklep/page.tsx")).toContain(
      "CEL-TRONICS · strefa partnera"
    )
  })

  it("rejects legacy marketplace and mission-control presentation", () => {
    const content = publicBrandSurfaces.map((screen) => read(screen)).join("\n")

    for (const token of forbiddenPublicTokens) {
      expect(content).not.toContain(token)
    }
  })

  it("keeps registration in the partner-domain language", () => {
    const page = read("src/app/rejestracja/page.tsx")
    const form = read(
      "src/app/rejestracja/_components/PartnerRegistrationForm.tsx"
    )

    expect(page).toContain("Załóż konto firmowe")
    expect(form).toContain("strefy partnera CEL-TRONICS")
    expect(form).not.toContain("platformy B2B CEL-TRONICS")
  })

  it("keeps the authenticated catalog task-shaped", () => {
    const shop = read("src/app/sklep/page.tsx")
    const grid = read("src/app/sklep/_components/ProductGrid.tsx")
    const cart = read("src/app/sklep/_components/MiniCart.tsx")

    expect(shop).toContain("Katalog i zamówienia")
    expect(grid).toContain("SKU")
    expect(grid).toContain("Stan")
    expect(grid).toContain("Cena")
    expect(cart).toContain("Wybrane pozycje")
  })
})
