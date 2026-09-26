import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  applyVerifiedPrzelewy24Payment,
  calculatePrzelewy24Sign,
  describePrzelewy24Runtime,
  resolvePrzelewy24Config,
  validatePrzelewy24NotificationForOrder,
  verifyPrzelewy24NotificationSignature,
  type Przelewy24Notification,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
import type { InventoryProduct } from "@/lib/inventoryReservations"

function config() {
  return resolvePrzelewy24Config({
    nodeEnv: "production",
    appUrl: "https://shop.example.com",
    merchantId: "123456",
    posId: "123456",
    apiKey: "api-key",
    crc: "crc-secret",
  })
}

function notification(
  overrides: Partial<Przelewy24Notification> = {}
): Przelewy24Notification {
  const base = {
    merchantId: 123456,
    posId: 123456,
    sessionId: "ORD-P24-1",
    amount: 12345,
    originAmount: 12345,
    currency: "PLN",
    orderId: 987654321,
    methodId: 25,
    statement: "ONICS ORD-P24-1",
  }

  return {
    ...base,
    sign: calculatePrzelewy24Sign({
      merchantId: base.merchantId,
      posId: base.posId,
      sessionId: base.sessionId,
      amount: base.amount,
      originAmount: base.originAmount,
      currency: base.currency,
      orderId: base.orderId,
      methodId: base.methodId,
      statement: base.statement,
      crc: "crc-secret",
    }),
    ...overrides,
  }
}

describe("Przelewy24 production protocol", () => {
  it("requires production credentials and a clean HTTPS public origin", () => {
    expect(
      describePrzelewy24Runtime({
        nodeEnv: "production",
        appUrl: "https://shop.example.com",
        merchantId: "123456",
        posId: "123456",
        apiKey: "api-key",
        crc: "crc",
      })
    ).toMatchObject({
      configured: true,
      webhookConfigured: true,
      configurationIssues: [],
      environment: "production",
    })

    expect(
      describePrzelewy24Runtime({
        nodeEnv: "production",
        appUrl: "http://shop.example.com/path",
        merchantId: "123456",
        posId: "123456",
        apiKey: "api-key",
        crc: "crc",
      })
    ).toMatchObject({
      configured: false,
      webhookConfigured: false,
      configurationIssues: ["PUBLIC_APP_URL_INVALID"],
    })
  })

  it("uses secure production and sandbox API origins deterministically", () => {
    expect(config()).toMatchObject({
      apiBaseUrl: "https://secure.przelewy24.pl",
      appUrl: "https://shop.example.com",
      environment: "production",
    })

    expect(
      resolvePrzelewy24Config({
        nodeEnv: "test",
        requestUrl: "http://localhost:3001/api/checkout",
        merchantId: "123456",
        posId: "123456",
        apiKey: "api-key",
        crc: "crc",
      })
    ).toMatchObject({
      apiBaseUrl: "https://sandbox.przelewy24.pl",
      appUrl: "http://localhost:3001",
      environment: "sandbox",
    })
  })

  it("calculates the SHA-384 notification checksum with the documented field order", () => {
    const payload = {
      merchantId: 123456,
      posId: 123456,
      sessionId: "ORD-P24-1",
      amount: 12345,
      originAmount: 12345,
      currency: "PLN",
      orderId: 987654321,
      methodId: 25,
      statement: "ONICS ORD-P24-1",
      crc: "crc-secret",
    }

    const independentlyCalculated = createHash("sha384")
      .update(JSON.stringify(payload), "utf8")
      .digest("hex")

    expect(calculatePrzelewy24Sign(payload)).toBe(independentlyCalculated)
    expect(
      verifyPrzelewy24NotificationSignature(notification(), config())
    ).toBe(true)
    expect(
      verifyPrzelewy24NotificationSignature(
        notification({ amount: 1 }),
        config()
      )
    ).toBe(false)
  })

  it("validates order identity, amount and currency before remote verification", () => {
    const order: Przelewy24StoredOrder = {
      id: "ORD-P24-1",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 123.45,
      paymentStatus: "PENDING",
      p24SessionId: "ORD-P24-1",
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      items: [{ id: "p1", quantity: 1 }],
    }

    expect(
      validatePrzelewy24NotificationForOrder(order, notification())
    ).toBe(true)

    expect(() =>
      validatePrzelewy24NotificationForOrder(
        order,
        notification({ amount: 999 })
      )
    ).toThrow("PRZELEWY24_AMOUNT_MISMATCH")
  })

  it("finalizes a reserved payment exactly once on notification replay", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 9 }]
    const order: Przelewy24StoredOrder = {
      id: "ORD-P24-1",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 123.45,
      paymentStatus: "PENDING",
      p24SessionId: "ORD-P24-1",
      p24OrderId: null,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      inventoryReservedAt: "2026-09-26T10:00:00.000Z",
      items: [{ id: "p1", quantity: 1 }],
    }

    expect(
      applyVerifiedPrzelewy24Payment(
        products,
        order,
        notification(),
        "2026-09-26T11:00:00.000Z"
      )
    ).toBe("paid")
    expect(order).toMatchObject({
      paymentStatus: "PAID",
      p24OrderId: 987654321,
      inventoryReservationStatus: "FINALIZED",
      inventoryFinalizedAt: "2026-09-26T11:00:00.000Z",
      paidAt: "2026-09-26T11:00:00.000Z",
    })
    expect(products[0].stock).toBe(9)

    expect(
      applyVerifiedPrzelewy24Payment(
        products,
        order,
        notification(),
        "2026-09-26T12:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(order.inventoryFinalizedAt).toBe(
      "2026-09-26T11:00:00.000Z"
    )
    expect(order.paidAt).toBe("2026-09-26T11:00:00.000Z")
    expect(products[0].stock).toBe(9)
  })
})
