import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  COMMERCE_TRANSACTION_ROLES,
  isCommerceTransactionRole,
} from "@/lib/commerceAccess"

describe("commerce transaction role boundary", () => {
  it("allows only ADMIN and BIZ transaction roles", () => {
    expect(COMMERCE_TRANSACTION_ROLES).toEqual(["ADMIN", "BIZ"])
    expect(isCommerceTransactionRole("ADMIN")).toBe(true)
    expect(isCommerceTransactionRole("BIZ")).toBe(true)
    expect(isCommerceTransactionRole("RETAIL")).toBe(false)
    expect(isCommerceTransactionRole("WHOLESALE")).toBe(false)
    expect(isCommerceTransactionRole(undefined)).toBe(false)
  })

  it("keeps order, checkout, payment discovery and provider adapters on the same boundary", () => {
    const ordersRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/orders/route.ts"),
      "utf8"
    )
    const checkoutRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/checkout/route.ts"),
      "utf8"
    )
    const paymentMethodsRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/payment-methods/route.ts"),
      "utf8"
    )
    const providerCheckout = fs.readFileSync(
      path.join(process.cwd(), "src/lib/paymentProviderCheckout.ts"),
      "utf8"
    )

    expect(ordersRoute).toContain(
      "authorizeAPI([...COMMERCE_TRANSACTION_ROLES])"
    )
    expect(checkoutRoute).toContain(
      "authorizeAPI([...COMMERCE_TRANSACTION_ROLES])"
    )
    expect(paymentMethodsRoute).toContain(
      "authorizeAPI([...COMMERCE_TRANSACTION_ROLES])"
    )
    expect(providerCheckout).toContain(
      "isCommerceTransactionRole(user.roleType)"
    )
    expect(checkoutRoute).toContain('code === "CHECKOUT_ROLE_NOT_ALLOWED"')
  })

  it("rechecks the current commerce role under the order write lock before reserving inventory", () => {
    const ordersRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/orders/route.ts"),
      "utf8"
    )
    const postStart = ordersRoute.indexOf("export async function POST")
    const putStart = ordersRoute.indexOf(
      "export async function PUT",
      postStart
    )
    const post = ordersRoute.slice(postStart, putStart)

    const mutation = post.indexOf("mutateMockData((db) =>")
    const currentRoleFence = post.indexOf(
      "isCommerceTransactionRole(storedUser.roleType)",
      mutation
    )
    const reservation = post.indexOf("reserveInventory(", currentRoleFence)

    expect(mutation).toBeGreaterThan(-1)
    expect(currentRoleFence).toBeGreaterThan(mutation)
    expect(reservation).toBeGreaterThan(currentRoleFence)
    expect(post).toContain('throw new Error("ORDER_ROLE_NOT_ALLOWED")')
  })

  it("keeps RETAIL browse-only in storefront/cart UX", () => {
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const productCard = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/ProductCard.tsx"),
      "utf8"
    )

    expect(cartPage).toContain('const isB2B = transactionAccess === "allowed"')
    expect(cartPage).toContain(
      "Konto detaliczne może przeglądać katalog i ceny bazowe"
    )
    expect(productCard).toContain(
      "const canAdd = isB2B && (hasActivePrice ? available : true)"
    )
  })
})
