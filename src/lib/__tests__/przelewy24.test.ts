import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  applyPrzelewy24RefundNotification,
  applyReconciledPrzelewy24Payment,
  applyVerifiedPrzelewy24Payment,
  calculatePrzelewy24Sign,
  describePrzelewy24Runtime,
  receivePrzelewy24Return,
  requestPrzelewy24Return,
  resolvePrzelewy24Config,
  stagePrzelewy24Refund,
  stagePrzelewy24Verification,
  testPrzelewy24Access,
  validatePrzelewy24NotificationForOrder,
  verifyPrzelewy24NotificationSignature,
  verifyPrzelewy24RefundNotificationSignature,
  type Przelewy24Notification,
  type Przelewy24RefundNotification,
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

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it("verifies P24 API access before provider activation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(testPrzelewy24Access(config())).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://secure.przelewy24.pl/api/v1/testAccess")
    expect(init.method).toBe("GET")
    expect(init.headers).toMatchObject({
      Authorization:
        "Basic " +
        Buffer.from("123456:api-key").toString("base64"),
    })
  })

  it.each([
    [401, { data: false }, "PRZELEWY24_ACCESS_UNAUTHORIZED"],
    [400, { data: false }, "PRZELEWY24_ACCESS_REJECTED"],
    [503, { data: false }, "PRZELEWY24_ACCESS_UNAVAILABLE"],
    [200, { data: "unexpected" }, "PRZELEWY24_ACCESS_REJECTED"],
  ])(
    "fails closed when testAccess returns HTTP %s",
    async (status, payload, expectedError) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" },
          })
        )
      )

      await expect(testPrzelewy24Access(config())).rejects.toThrow(
        expectedError
      )
    }
  )

  it("fails closed when the P24 access probe cannot reach the provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable"))
    )

    await expect(testPrzelewy24Access(config())).rejects.toThrow(
      "PRZELEWY24_ACCESS_UNAVAILABLE"
    )
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

  it("recovers a paid transaction from authoritative transaction details", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 9 }]
    const order: Przelewy24StoredOrder = {
      id: "ORD-P24-RECOVER",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 123.45,
      paymentStatus: "PENDING",
      p24SessionId: "ORD-P24-RECOVER",
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      items: [{ id: "p1", quantity: 1 }],
    }

    expect(
      applyReconciledPrzelewy24Payment(
        products,
        order,
        {
          orderId: 987654321,
          sessionId: "ORD-P24-RECOVER",
          status: 1,
          amount: 12345,
          currency: "PLN",
        },
        "2026-09-26T10:45:00.000Z"
      )
    ).toBe("paid")

    expect(order).toMatchObject({
      paymentStatus: "PAID",
      p24OrderId: 987654321,
      inventoryReservationStatus: "FINALIZED",
      paymentReconciledAt: "2026-09-26T10:45:00.000Z",
    })
    expect(products[0].stock).toBe(9)

    expect(
      applyReconciledPrzelewy24Payment(
        products,
        order,
        {
          orderId: 987654321,
          sessionId: "ORD-P24-RECOVER",
          status: 1,
          amount: 12345,
          currency: "PLN",
        },
        "2026-09-26T10:50:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(9)
  })

  it("durably stages the notification before provider verification", () => {
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
      stagePrzelewy24Verification(
        order,
        notification(),
        "2026-09-26T10:30:00.000Z"
      )
    ).toBe("staged")
    expect(order.p24VerificationPending).toMatchObject({
      sessionId: "ORD-P24-1",
      orderId: 987654321,
      amount: 12345,
      currency: "PLN",
    })
    expect(order.p24VerificationPendingAt).toBe(
      "2026-09-26T10:30:00.000Z"
    )

    expect(stagePrzelewy24Verification(order, notification())).toBe(
      "unchanged"
    )
    expect(() =>
      stagePrzelewy24Verification(
        order,
        notification({ orderId: 987654322 })
      )
    ).toThrow("PRZELEWY24_PENDING_NOTIFICATION_MISMATCH")
  })

  it("verifies the documented Przelewy24 refund notification checksum", () => {
    const refundBase = {
      orderId: 987654321,
      sessionId: "ORD-P24-1",
      merchantId: 123456,
      requestId: "onics-refund-request",
      refundsUuid: "refund-uuid",
      amount: 12345,
      currency: "PLN",
      timestamp: 1790430000,
      status: 0 as const,
    }
    const sign = calculatePrzelewy24Sign({
      orderId: refundBase.orderId,
      sessionId: refundBase.sessionId,
      refundsUuid: refundBase.refundsUuid,
      merchantId: refundBase.merchantId,
      amount: refundBase.amount,
      currency: refundBase.currency,
      status: refundBase.status,
      crc: "crc-secret",
    })

    const refund: Przelewy24RefundNotification = {
      ...refundBase,
      sign,
    }

    expect(
      verifyPrzelewy24RefundNotificationSignature(refund, config())
    ).toBe(true)
    expect(
      verifyPrzelewy24RefundNotificationSignature(
        { ...refund, amount: 1 },
        config()
      )
    ).toBe(false)
  })

  it("keeps rejected refunds retryable with a new idempotency identity", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const order: Przelewy24StoredOrder = {
      id: "ORD-P24-REFUND",
      status: "SHIPPED",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 123.45,
      paymentStatus: "PAID",
      p24SessionId: "ORD-P24-REFUND",
      p24OrderId: 987654321,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "FINALIZED",
      items: [{ id: "p1", quantity: 2 }],
    }

    expect(requestPrzelewy24Return(order)).toBe("requested")
    expect(receivePrzelewy24Return(order)).toBe("received")
    const first = stagePrzelewy24Refund(order)
    expect(first.outcome).toBe("staged")

    const rejected: Przelewy24RefundNotification = {
      orderId: 987654321,
      sessionId: "ORD-P24-REFUND",
      merchantId: 123456,
      requestId: first.requestId,
      refundsUuid: first.refundsUuid,
      amount: 12345,
      currency: "PLN",
      timestamp: 1790430000,
      status: 1,
      sign: "b".repeat(96),
    }

    expect(
      applyPrzelewy24RefundNotification(products, order, rejected)
    ).toBe("failed")
    expect(order).toMatchObject({
      paymentStatus: "PAID",
      refundStatus: "failed",
      returnStatus: "RECEIVED",
    })
    expect(products[0].stock).toBe(8)

    const retry = stagePrzelewy24Refund(order)
    expect(retry.outcome).toBe("staged")
    expect(retry.requestId).not.toBe(first.requestId)
    expect(retry.refundsUuid).not.toBe(first.refundsUuid)
    expect(order.p24RefundAttempt).toBe(2)
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
    expect(order.p24VerificationPending).toBeNull()
    expect(order.p24VerificationPendingAt).toBeNull()

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
