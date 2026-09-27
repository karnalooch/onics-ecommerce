import { describe, expect, it } from "vitest"
import {
  buildStripeCheckoutSessionParams,
  stripeCheckoutIdempotencyKey,
} from "@/lib/stripeCheckoutCreation"

describe("Stripe checkout creation contract", () => {
  const order = {
    id: "ORD-123",
    items: [
      {
        id: "p1",
        sku: "SKU-1",
        name: "Sterownik",
        quantity: 2,
        price: 12.34,
      },
    ],
    user: {
      id: "u-1",
      email: "partner@example.test",
      nip: "1234567890",
      roleType: "BIZ",
    },
  }

  it("derives one stable non-sensitive idempotency key from the order id", () => {
    expect(stripeCheckoutIdempotencyKey("ORD-123"))
      .toBe("onics-checkout:ORD-123")
    expect(stripeCheckoutIdempotencyKey(" ORD-123 "))
      .toBe("onics-checkout:ORD-123")
  })

  it("rebuilds the exact persisted checkout payload for retry", () => {
    const params = buildStripeCheckoutSessionParams(
      order,
      "https://shop.example.test"
    )

    expect(params).toMatchObject({
      mode: "payment",
      success_url:
        "https://shop.example.test/oferty/zamowienia?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://shop.example.test/koszyk?payment=cancelled",
      client_reference_id: "u-1",
      customer_email: "partner@example.test",
      metadata: {
        order_id: "ORD-123",
        pl_nip: "1234567890",
        client_role: "BIZ",
      },
      payment_intent_data: {
        metadata: { order_id: "ORD-123" },
      },
    })
    expect(params.line_items).toEqual([
      {
        price_data: {
          currency: "pln",
          unit_amount: 1234,
          product_data: {
            name: "Sterownik",
            metadata: {
              sku: "SKU-1",
              product_id: "p1",
            },
          },
        },
        quantity: 2,
      },
    ])
  })

  it("fails closed when the persisted order cannot reproduce checkout", () => {
    expect(() =>
      buildStripeCheckoutSessionParams(
        { ...order, items: [] },
        "https://shop.example.test"
      )
    ).toThrow("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")

    expect(() => stripeCheckoutIdempotencyKey("")).toThrow(
      "PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID"
    )
  })
})
