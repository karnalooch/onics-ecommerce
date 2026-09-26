import { describe, expect, it } from "vitest"
import {
  PAYMENT_WEBHOOK_EVENT_LIMIT,
  hasProcessedPaymentWebhookEvent,
  paymentWebhookEventHash,
  recordProcessedPaymentWebhookEvent,
} from "@/lib/paymentWebhookLedger"
import type { PaymentWebhookEvent } from "@/store/serverStore"

describe("payment webhook event ledger", () => {
  it("derives deterministic provider-scoped hashes without storing raw ids", () => {
    const stripe = paymentWebhookEventHash({
      provider: "STRIPE",
      kind: "PAYMENT",
      externalId: "evt_123",
    })
    const p24 = paymentWebhookEventHash({
      provider: "PRZELEWY24",
      kind: "PAYMENT",
      externalId: "evt_123",
    })

    expect(stripe).toMatch(/^[0-9a-f]{64}$/)
    expect(stripe).not.toContain("evt_123")
    expect(stripe).not.toBe(p24)
  })

  it("rejects non-consecutive replay while the event remains retained", () => {
    const events: PaymentWebhookEvent[] = []
    const a = {
      provider: "STRIPE" as const,
      kind: "PAYMENT" as const,
      externalId: "evt_A",
    }
    const b = {
      provider: "STRIPE" as const,
      kind: "PAYMENT" as const,
      externalId: "evt_B",
    }

    expect(recordProcessedPaymentWebhookEvent(events, a)).toBe(true)
    expect(recordProcessedPaymentWebhookEvent(events, b)).toBe(true)
    expect(hasProcessedPaymentWebhookEvent(events, a)).toBe(true)
    expect(recordProcessedPaymentWebhookEvent(events, a)).toBe(false)
    expect(events).toHaveLength(2)
  })

  it("keeps payment and refund event identities separate", () => {
    const events: PaymentWebhookEvent[] = []
    const payment = {
      provider: "PRZELEWY24" as const,
      kind: "PAYMENT" as const,
      externalId: "same-provider-id",
    }
    const refund = {
      provider: "PRZELEWY24" as const,
      kind: "REFUND" as const,
      externalId: "same-provider-id",
    }

    expect(recordProcessedPaymentWebhookEvent(events, payment)).toBe(true)
    expect(hasProcessedPaymentWebhookEvent(events, refund)).toBe(false)
  })

  it("bounds retained events and keeps newest entries", () => {
    const events: PaymentWebhookEvent[] = []

    for (let index = 0; index < PAYMENT_WEBHOOK_EVENT_LIMIT + 20; index += 1) {
      recordProcessedPaymentWebhookEvent(
        events,
        {
          provider: "STRIPE",
          kind: "PAYMENT",
          externalId: `evt_${index}`,
        },
        new Date(1_790_000_000_000 + index).toISOString()
      )
    }

    expect(events).toHaveLength(PAYMENT_WEBHOOK_EVENT_LIMIT)
    expect(
      hasProcessedPaymentWebhookEvent(events, {
        provider: "STRIPE",
        kind: "PAYMENT",
        externalId: "evt_519",
      })
    ).toBe(true)
    expect(
      hasProcessedPaymentWebhookEvent(events, {
        provider: "STRIPE",
        kind: "PAYMENT",
        externalId: "evt_0",
      })
    ).toBe(false)
  })

  it("fails closed on a missing provider event id", () => {
    expect(() =>
      paymentWebhookEventHash({
        provider: "STRIPE",
        kind: "PAYMENT",
        externalId: "",
      })
    ).toThrow("PAYMENT_WEBHOOK_EVENT_ID_MISSING")
  })
})
