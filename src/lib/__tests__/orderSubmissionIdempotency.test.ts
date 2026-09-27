import { describe, expect, it } from "vitest"
import {
  buildOrderSubmissionSignature,
  clearOrderSubmissionRequestId,
  getOrCreateOrderSubmissionRequestId,
  sameOrderSubmissionItems,
  type IdempotencyStorage,
} from "@/lib/orderSubmissionIdempotency"

function memoryStorage(): IdempotencyStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

describe("order submission idempotency", () => {
  it("canonicalizes item order and duplicate lines", () => {
    const left = buildOrderSubmissionSignature({
      ownerKey: "id:user-1",
      orderType: "ORDER",
      items: [
        { id: "p2", quantity: 1 },
        { id: "p1", quantity: 2 },
        { id: "p1", quantity: 3 },
      ],
    })
    const right = buildOrderSubmissionSignature({
      ownerKey: "id:user-1",
      orderType: "ORDER",
      items: [
        { id: "p1", quantity: 5 },
        { id: "p2", quantity: 1 },
      ],
    })

    expect(left).toBe(right)
    expect(
      sameOrderSubmissionItems(
        [
          { id: "p1", quantity: 2 },
          { id: "p1", quantity: 3 },
        ],
        [{ id: "p1", quantity: 5 }]
      )
    ).toBe(true)
  })

  it("reuses a pending request id for the same owner, action and cart", () => {
    const storage = memoryStorage()
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]
    let index = 0
    const createId = () => ids[index++]

    const input = {
      ownerKey: "id:user-1",
      orderType: "ORDER" as const,
      items: [{ id: "p1", quantity: 2 }],
    }

    expect(
      getOrCreateOrderSubmissionRequestId(input, storage, createId)
    ).toBe(ids[0])
    expect(
      getOrCreateOrderSubmissionRequestId(input, storage, createId)
    ).toBe(ids[0])
    expect(index).toBe(1)
  })

  it("uses a new key when owner, action or cart changes", () => {
    const storage = memoryStorage()
    let counter = 0
    const createId = () =>
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ][counter++]

    const base = {
      ownerKey: "id:user-1",
      orderType: "ORDER" as const,
      items: [{ id: "p1", quantity: 1 }],
    }

    const first = getOrCreateOrderSubmissionRequestId(base, storage, createId)
    const changedCart = getOrCreateOrderSubmissionRequestId(
      { ...base, items: [{ id: "p1", quantity: 2 }] },
      storage,
      createId
    )
    const changedAction = getOrCreateOrderSubmissionRequestId(
      { ...base, orderType: "INQUIRY" },
      storage,
      createId
    )
    const changedOwner = getOrCreateOrderSubmissionRequestId(
      { ...base, ownerKey: "id:user-2" },
      storage,
      createId
    )

    expect(new Set([first, changedCart, changedAction, changedOwner]).size).toBe(4)
  })

  it("forgets a completed key so an intentional later repeat is new", () => {
    const storage = memoryStorage()
    const input = {
      ownerKey: "id:user-1",
      orderType: "ORDER" as const,
      items: [{ id: "p1", quantity: 1 }],
    }
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]
    let index = 0

    const first = getOrCreateOrderSubmissionRequestId(
      input,
      storage,
      () => ids[index++]
    )
    clearOrderSubmissionRequestId(first, storage)
    const second = getOrCreateOrderSubmissionRequestId(
      input,
      storage,
      () => ids[index++]
    )

    expect(first).toBe(ids[0])
    expect(second).toBe(ids[1])
  })

  it("detects request payload reuse with different quantities", () => {
    expect(
      sameOrderSubmissionItems(
        [{ id: "p1", quantity: 2 }],
        [{ id: "p1", quantity: 3 }]
      )
    ).toBe(false)
  })
})
