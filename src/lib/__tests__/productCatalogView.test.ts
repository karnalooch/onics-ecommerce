import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  projectProductCatalogForSession,
  type ProductCatalogRecord,
} from "@/lib/productCatalogView"

const product: ProductCatalogRecord = {
  id: "p1",
  sku: "SKU-1",
  name: "Produkt",
  price: 100,
  catalogPrice: 120,
  stock: 5,
}

describe("product catalog session projection", () => {
  it("hides sale and reference prices from anonymous readers", () => {
    const [projected] = projectProductCatalogForSession([product], [])

    expect(projected.price).toBeNull()
    expect(projected.catalogPrice).toBeNull()
    expect(projected.priceHidden).toBe(true)
  })

  it("applies the current approved B2B account discount", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [
        {
          id: "u1",
          email: "partner@example.com",
          roleType: "BIZ",
          isApproved: true,
          discount: 15,
        },
      ],
      { id: "u1", email: "stale@example.com" }
    )

    expect(projected.price).toBe(85)
    expect(projected.catalogPrice).toBe(120)
    expect(projected.priceHidden).toBe(false)
  })

  it("does not grant B2B pricing through a reused email when the session id is stale", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [
        {
          id: "u_other",
          email: "reused@example.com",
          roleType: "BIZ",
          isApproved: true,
          discount: 50,
        },
      ],
      { id: "u_deleted", email: "reused@example.com" }
    )

    expect(projected.price).toBeNull()
    expect(projected.catalogPrice).toBeNull()
    expect(projected.priceHidden).toBe(true)
  })

  it("keeps blocked and pending B2B accounts price-hidden", () => {
    for (const user of [
      {
        id: "blocked",
        roleType: "BIZ",
        isApproved: true,
        isBlocked: true,
        discount: 20,
      },
      {
        id: "pending",
        roleType: "BIZ",
        isApproved: false,
        isBlocked: false,
        discount: 20,
      },
    ]) {
      const [projected] = projectProductCatalogForSession(
        [product],
        [user],
        { id: user.id }
      )
      expect(projected.priceHidden).toBe(true)
      expect(projected.price).toBeNull()
    }
  })

  it("keeps ADMIN on the active base sale price", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [{ id: "admin", roleType: "ADMIN", isApproved: true, discount: 99 }],
      { id: "admin" }
    )

    expect(projected.price).toBe(100)
    expect(projected.priceHidden).toBe(false)
  })
})

describe("catalog projection wiring", () => {
  it("uses the shared server projection instead of a session-losing self-fetch", () => {
    const publicPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/produkty/page.tsx"),
      "utf8"
    )
    const apiRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/products/route.ts"),
      "utf8"
    )

    expect(publicPage).toContain("buildProductCatalogView")
    expect(apiRoute).toContain("buildProductCatalogView")
    expect(publicPage).not.toContain("/api/products")
    expect(publicPage).not.toContain("NEXTAUTH_URL")
  })
})
