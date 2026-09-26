import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  buildStorefrontCatalogSnapshot,
  type StorefrontProduct,
  type StorefrontUser,
} from "@/lib/storefrontCatalog"

const product: StorefrontProduct = {
  id: "p1",
  sku: "SKU-1",
  name: "Produkt",
  price: 100,
  stock: 5,
}

describe("storefront access and pricing contract", () => {
  it("applies B2B pricing only to an approved current BIZ account", () => {
    const snapshot = buildStorefrontCatalogSnapshot(
      [product],
      [
        {
          id: "biz",
          email: "biz@example.com",
          roleType: "BIZ",
          isApproved: true,
          discount: 15,
        },
      ],
      { id: "biz", email: "stale@example.com" }
    )

    expect(snapshot.status).toBe("allowed")
    if (snapshot.status !== "allowed") return

    expect(snapshot.user.role).toBe("BIZ")
    expect(snapshot.products[0].price).toBe(85)
  })

  it("keeps RETAIL and ADMIN on the base sale price", () => {
    for (const roleType of ["RETAIL", "ADMIN"] as const) {
      const users: StorefrontUser[] = [
        {
          id: roleType,
          roleType,
          isApproved: true,
          discount: 99,
        },
      ]
      const snapshot = buildStorefrontCatalogSnapshot(
        [product],
        users,
        { id: roleType }
      )

      expect(snapshot.status).toBe("allowed")
      if (snapshot.status !== "allowed") continue
      expect(snapshot.user.role).toBe(roleType)
      expect(snapshot.products[0].price).toBe(100)
    }
  })

  it("keeps pending B2B accounts out of the priced storefront", () => {
    const snapshot = buildStorefrontCatalogSnapshot(
      [product],
      [{ id: "pending", roleType: "BIZ", isApproved: false, discount: 50 }],
      { id: "pending" }
    )

    expect(snapshot).toEqual({ status: "pending" })
  })

  it("fails closed for blocked, missing and unknown-role accounts", () => {
    const cases: Array<{ users: StorefrontUser[]; id: string }> = [
      {
        users: [
          {
            id: "blocked",
            roleType: "RETAIL",
            isBlocked: true,
          },
        ],
        id: "blocked",
      },
      {
        users: [{ id: "missing-role" }],
        id: "missing-role",
      },
      {
        users: [{ id: "unknown-role", roleType: "WHOLESALE" }],
        id: "unknown-role",
      },
      {
        users: [],
        id: "deleted",
      },
    ]

    for (const testCase of cases) {
      expect(
        buildStorefrontCatalogSnapshot(
          [product],
          testCase.users,
          { id: testCase.id }
        )
      ).toEqual({ status: "denied" })
    }
  })

  it("does not rebind a stale session id through a reused email", () => {
    const snapshot = buildStorefrontCatalogSnapshot(
      [product],
      [
        {
          id: "replacement",
          email: "reused@example.com",
          roleType: "RETAIL",
        },
      ],
      { id: "deleted", email: "reused@example.com" }
    )

    expect(snapshot).toEqual({ status: "denied" })
  })
})

describe("storefront contract wiring", () => {
  it("keeps access and pricing decisions out of the page component", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/page.tsx"),
      "utf8"
    )

    expect(page).toContain("buildStorefrontCatalogSnapshot")
    expect(page).not.toContain("calculateCustomerUnitPrice")
    expect(page).not.toContain("findStoredUserBySession")
    expect(page).not.toContain('role={user.role || "RETAIL"}')
  })
})
