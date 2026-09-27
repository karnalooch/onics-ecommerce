import Stripe from "stripe"
import { moneyToMinorUnits } from "@/lib/payments"

export type PersistedStripeCheckoutItem = {
  id: string
  sku: string
  name: string
  quantity: number
  price: number
}

export type PersistedStripeCheckoutUser = {
  id?: string
  email?: string | null
  nip?: string | null
  roleType?: string | null
}

export const STRIPE_CHECKOUT_IDEMPOTENCY_GUARD_MS =
  23 * 60 * 60 * 1000

export type PersistedStripeCheckoutOrder = {
  id?: string
  createdAt?: string | null
  items?: unknown[]
  user?: PersistedStripeCheckoutUser
}

export function isStripeCheckoutCreationRetrySafe(
  order: PersistedStripeCheckoutOrder,
  nowMs = Date.now()
) {
  const createdAt = Date.parse(String(order.createdAt ?? ""))
  if (!Number.isFinite(createdAt)) return false

  const ageMs = nowMs - createdAt
  return ageMs >= 0 && ageMs < STRIPE_CHECKOUT_IDEMPOTENCY_GUARD_MS
}

export function stripeCheckoutIdempotencyKey(orderId: string) {
  const normalized = orderId.trim()
  if (!normalized) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }
  return `onics-checkout:${normalized}`
}

function persistedItems(
  order: PersistedStripeCheckoutOrder
): PersistedStripeCheckoutItem[] {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  return order.items.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
    }
    const item = candidate as Record<string, unknown>
    const id = String(item.id ?? "").trim()
    const sku = String(item.sku ?? "").trim()
    const name = String(item.name ?? "").trim()
    const quantity = Number(item.quantity)
    const price = Number(item.price)

    if (
      !id ||
      !sku ||
      !name ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
    }

    return { id, sku, name, quantity, price }
  })
}

export function buildStripeCheckoutSessionParams(
  order: PersistedStripeCheckoutOrder,
  appUrl: string
): Stripe.Checkout.SessionCreateParams {
  const orderId = String(order.id ?? "").trim()
  const checkoutUser = order.user
  const items = persistedItems(order)
  if (!orderId || !checkoutUser) {
    throw new Error("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")
  }

  return {
    line_items: items.map((item) => ({
      price_data: {
        currency: "pln",
        unit_amount: moneyToMinorUnits(item.price),
        product_data: {
          name: item.name,
          metadata: {
            sku: item.sku,
            product_id: item.id,
          },
        },
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${appUrl}/oferty/zamowienia?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/koszyk?payment=cancelled`,
    client_reference_id: String(checkoutUser.id ?? ""),
    customer_email: checkoutUser.email ?? undefined,
    metadata: {
      order_id: orderId,
      pl_nip: checkoutUser.nip || "",
      client_role: checkoutUser.roleType || "BIZ",
    },
    payment_intent_data: {
      metadata: {
        order_id: orderId,
      },
    },
  }
}

export async function createStripeCheckoutSessionForOrder(
  stripe: Stripe,
  appUrl: string,
  order: PersistedStripeCheckoutOrder
) {
  const orderId = String(order.id ?? "").trim()
  return stripe.checkout.sessions.create(
    buildStripeCheckoutSessionParams(order, appUrl),
    {
      idempotencyKey: stripeCheckoutIdempotencyKey(orderId),
    }
  )
}
