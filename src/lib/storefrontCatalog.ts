import {
  calculateCustomerUnitPrice,
  type CommerceProduct,
} from "@/lib/commerce"
import {
  findStoredUserBySession,
  type SessionIdentity,
} from "@/lib/sessionIdentity"

export type StorefrontRole = "ADMIN" | "BIZ" | "RETAIL"

export type StorefrontUser = {
  id?: string | null
  email?: string | null
  roleType?: string | null
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number | null
}

export type StorefrontProduct = CommerceProduct & {
  [key: string]: unknown
}

type StorefrontAllowedUser = {
  role: StorefrontRole
  discount: number
}

export type StorefrontCatalogSnapshot =
  | { status: "denied" }
  | { status: "pending" }
  | {
      status: "allowed"
      user: StorefrontAllowedUser
      products: StorefrontProduct[]
    }

function isStorefrontRole(value: unknown): value is StorefrontRole {
  return value === "ADMIN" || value === "BIZ" || value === "RETAIL"
}

export function projectStorefrontProducts(
  products: StorefrontProduct[],
  user: StorefrontAllowedUser
) {
  return products.map((product) => ({
    ...product,
    price: calculateCustomerUnitPrice(product, {
      role: user.role,
      discount: user.discount,
    }),
  }))
}

export function buildStorefrontCatalogSnapshot(
  products: StorefrontProduct[],
  users: StorefrontUser[],
  sessionUser: SessionIdentity
): StorefrontCatalogSnapshot {
  const currentUser = findStoredUserBySession(users, sessionUser)

  if (
    !currentUser ||
    currentUser.isBlocked ||
    !isStorefrontRole(currentUser.roleType)
  ) {
    return { status: "denied" }
  }

  if (currentUser.roleType === "BIZ" && currentUser.isApproved !== true) {
    return { status: "pending" }
  }

  const user: StorefrontAllowedUser = {
    role: currentUser.roleType,
    discount: Number(currentUser.discount ?? 0),
  }

  return {
    status: "allowed",
    user,
    products: projectStorefrontProducts(products, user),
  }
}
