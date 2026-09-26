import { createHash } from "node:crypto"
import type {
  PaymentWebhookEvent,
} from "@/store/serverStore"
import type { PaymentProviderId } from "@/lib/paymentProviders"

export const PAYMENT_WEBHOOK_EVENT_LIMIT = 500

export type PaymentWebhookEventKind = "PAYMENT" | "REFUND"

export type PaymentWebhookEventIdentity = {
  provider: PaymentProviderId
  kind: PaymentWebhookEventKind
  externalId: string
}

export function paymentWebhookEventHash(
  identity: PaymentWebhookEventIdentity
) {
  if (!identity.externalId) {
    throw new Error("PAYMENT_WEBHOOK_EVENT_ID_MISSING")
  }

  return createHash("sha256")
    .update(
      `${identity.provider}\0${identity.kind}\0${identity.externalId}`,
      "utf8"
    )
    .digest("hex")
}

export function hasProcessedPaymentWebhookEvent(
  events: PaymentWebhookEvent[],
  identity: PaymentWebhookEventIdentity
) {
  const eventHash = paymentWebhookEventHash(identity)
  return events.some((event) => event.eventHash === eventHash)
}

export function recordProcessedPaymentWebhookEvent(
  events: PaymentWebhookEvent[],
  identity: PaymentWebhookEventIdentity,
  now = new Date().toISOString()
) {
  const eventHash = paymentWebhookEventHash(identity)
  if (events.some((event) => event.eventHash === eventHash)) {
    return false
  }

  events.unshift({
    id: eventHash,
    createdAt: now,
    provider: identity.provider,
    kind: identity.kind,
    eventHash,
  })

  if (events.length > PAYMENT_WEBHOOK_EVENT_LIMIT) {
    events.splice(PAYMENT_WEBHOOK_EVENT_LIMIT)
  }

  return true
}
