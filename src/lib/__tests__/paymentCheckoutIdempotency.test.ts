import { describe, expect, it } from "vitest"
import {
  buildPaymentCheckoutFingerprint,
  clearPaymentCheckoutRequestId,
  getOrCreatePaymentCheckoutRequestId,
  type PaymentCheckoutIdempotencyStorage,
} from "@/lib/paymentCheckoutIdempotency"

function memoryStorage(): PaymentCheckoutIdempotencyStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

describe("payment checkout idempotency", () => {
  it("canonicalizes item order and duplicate lines", () => {
    const left = buildPaymentCheckoutFingerprint({
      paymentMethod: "STRIPE",
      items: [
        { id: "p2", quantity: 1 },
        { id: "p1", quantity: 2 },
        { id: "p1", quantity: 3 },
      ],
    })
    const right = buildPaymentCheckoutFingerprint({
      paymentMethod: "STRIPE",
      items: [
        { id: "p1", quantity: 5 },
        { id: "p2", quantity: 1 },
      ],
    })

    expect(left).toBe(right)
  })

  it("reuses one pending key for the same owner, provider and cart", () => {
    const storage = memoryStorage()
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]
    let index = 0
    const input = {
      ownerKey: "id:user-1",
      paymentMethod: "STRIPE",
      items: [{ id: "p1", quantity: 2 }],
    }

    const first = getOrCreatePaymentCheckoutRequestId(
      input,
      storage,
      () => ids[index++]
    )
    const second = getOrCreatePaymentCheckoutRequestId(
      input,
      storage,
      () => ids[index++]
    )

    expect(first).toBe(ids[0])
    expect(second).toBe(ids[0])
    expect(index).toBe(1)
  })

  it("changes key with owner, provider or cart", () => {
    const storage = memoryStorage()
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ]
    let index = 0
    const createId = () => ids[index++]

    const base = {
      ownerKey: "id:user-1",
      paymentMethod: "STRIPE",
      items: [{ id: "p1", quantity: 1 }],
    }

    const keys = [
      getOrCreatePaymentCheckoutRequestId(base, storage, createId),
      getOrCreatePaymentCheckoutRequestId(
        { ...base, ownerKey: "id:user-2" },
        storage,
        createId
      ),
      getOrCreatePaymentCheckoutRequestId(
        { ...base, paymentMethod: "PRZELEWY24" },
        storage,
        createId
      ),
      getOrCreatePaymentCheckoutRequestId(
        { ...base, items: [{ id: "p1", quantity: 2 }] },
        storage,
        createId
      ),
    ]

    expect(new Set(keys).size).toBe(4)
  })

  it("forgets a completed key", () => {
    const storage = memoryStorage()
    const input = {
      ownerKey: "id:user-1",
      paymentMethod: "BANK_TRANSFER",
      items: [{ id: "p1", quantity: 1 }],
    }
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]
    let index = 0

    const first = getOrCreatePaymentCheckoutRequestId(
      input,
      storage,
      () => ids[index++]
    )
    clearPaymentCheckoutRequestId(first, storage)
    const second = getOrCreatePaymentCheckoutRequestId(
      input,
      storage,
      () => ids[index++]
    )

    expect(first).not.toBe(second)
  })
})
