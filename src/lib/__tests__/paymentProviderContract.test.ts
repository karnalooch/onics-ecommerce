import { describe, expect, it } from "vitest"
import {
  applyExpiredCheckoutCancellation,
  applyStripeRefundSnapshot,
  type StripeCancelableOrder,
} from "@/lib/refunds"
import {
  confirmBankTransferPayment,
  confirmBankTransferRefund,
  type BankTransferOrder,
} from "@/lib/manualPayments"
import {
  applyOrderInventoryTransition,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import {
  PAYMENT_PROVIDER_IDS,
  type PaymentProviderId,
} from "@/lib/paymentProviders"
import {
  definePaymentProviderContract,
  type PaymentProviderContractHarness,
} from "@/lib/__tests__/paymentProviderContractKit"

const harnesses = {
  STRIPE: {
    id: "STRIPE",
    validRuntimeOptions: {
      nodeEnv: "production",
      stripeSecretKey: "sk_contract_secret",
      stripeWebhookSecret: "whsec_contract_secret",
      appUrl: "https://shop.example.com",
    },
    invalidRuntimeOptions: {
      nodeEnv: "production",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      appUrl: "http://shop.example.com",
    },
    sensitiveRuntimeValues: [
      "sk_contract_secret",
      "whsec_contract_secret",
      "https://shop.example.com",
    ],
    legacyOrder: {
      stripeCheckoutSessionId: "cs_contract_legacy",
    },
    checkoutResult: {
      orderId: "ORD-CONTRACT-STRIPE-CHECKOUT",
      paymentMethod: "STRIPE",
      nextAction: {
        type: "REDIRECT",
        url: "https://checkout.example/contract",
      },
    },
    assertIdempotency: () => {
      const cancellationProducts: InventoryProduct[] = [
        { id: "p1", stock: 3 },
      ]
      const unpaidOrder: StripeCancelableOrder = {
        id: "ORD-CONTRACT-STRIPE-CANCEL",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
        stripeCheckoutSessionId: "cs_contract_cancel",
        items: [{ id: "p1", quantity: 2 }],
        inventoryReservationSource: "STRIPE",
        inventoryReservationStatus: "RESERVED",
      }

      expect(
        applyExpiredCheckoutCancellation(
          cancellationProducts,
          unpaidOrder,
          "2026-09-26T10:00:00.000Z"
        )
      ).toBe("cancelled")
      expect(
        applyExpiredCheckoutCancellation(
          cancellationProducts,
          unpaidOrder,
          "2026-09-26T11:00:00.000Z"
        )
      ).toBe("unchanged")
      expect(cancellationProducts[0].stock).toBe(5)

      const refundProducts: InventoryProduct[] = [{ id: "p1", stock: 3 }]
      const paidOrder: StripeCancelableOrder = {
        id: "ORD-CONTRACT-STRIPE-REFUND",
        status: "CONFIRMED",
        totalPriceFinal: 100,
        paymentStatus: "PAID",
        stripeCheckoutSessionId: "cs_contract_refund",
        stripePaymentIntentId: "pi_contract_refund",
        items: [{ id: "p1", quantity: 2 }],
        inventoryReservationSource: "STRIPE",
        inventoryReservationStatus: "FINALIZED",
      }
      const refund = {
        orderId: paidOrder.id,
        refundId: "re_contract",
        paymentIntentId: "pi_contract_refund",
        amount: 10000,
        currency: "pln",
        status: "succeeded" as const,
      }

      expect(
        applyStripeRefundSnapshot(
          refundProducts,
          paidOrder,
          refund,
          "2026-09-26T12:00:00.000Z"
        )
      ).toBe("succeeded")
      expect(
        applyStripeRefundSnapshot(
          refundProducts,
          paidOrder,
          refund,
          "2026-09-26T13:00:00.000Z"
        )
      ).toBe("succeeded")
      expect(refundProducts[0].stock).toBe(5)
    },
  },
  BANK_TRANSFER: {
    id: "BANK_TRANSFER",
    validRuntimeOptions: {
      bankTransferRecipient: "ONICS Contract",
      bankTransferAccountNumber: "PL12 3456 7890 1234 5678 9012 3456",
    },
    invalidRuntimeOptions: {
      bankTransferRecipient: "",
      bankTransferAccountNumber: "123",
    },
    sensitiveRuntimeValues: [
      "ONICS Contract",
      "PL12 3456 7890 1234 5678 9012 3456",
    ],
    legacyOrder: {
      bankTransferReference: "ORD-CONTRACT-LEGACY",
    },
    checkoutResult: {
      orderId: "ORD-CONTRACT-BANK-CHECKOUT",
      paymentMethod: "BANK_TRANSFER",
      nextAction: {
        type: "MANUAL",
        title: "Dane do przelewu",
        fields: [
          { label: "Odbiorca", value: "ONICS Contract" },
          {
            label: "IBAN",
            value: "PL12345678901234567890123456",
            monospace: true,
          },
        ],
        amount: 100,
        currency: "PLN",
      },
    },
    assertIdempotency: () => {
      const pending: BankTransferOrder = {
        id: "ORD-CONTRACT-BANK-PAY",
        status: "PENDING_VERIFICATION",
        paymentProvider: "BANK_TRANSFER",
        paymentStatus: "PENDING",
        inventoryReservationSource: "ORDER",
        inventoryReservationStatus: "RESERVED",
        items: [{ id: "p1", quantity: 2 }],
      }

      expect(
        confirmBankTransferPayment(
          pending,
          { id: "admin-contract" },
          "2026-09-26T10:00:00.000Z"
        )
      ).toBe("confirmed")
      expect(
        confirmBankTransferPayment(
          pending,
          { id: "other-admin" },
          "2026-09-26T11:00:00.000Z"
        )
      ).toBe("unchanged")
      expect(pending.paymentConfirmedBy?.id).toBe("admin-contract")

      const cancelProducts: InventoryProduct[] = [{ id: "p1", stock: 3 }]
      const cancelOrder: BankTransferOrder = {
        id: "ORD-CONTRACT-BANK-CANCEL",
        status: "PENDING_VERIFICATION",
        paymentProvider: "BANK_TRANSFER",
        paymentStatus: "PENDING",
        inventoryReservationSource: "ORDER",
        inventoryReservationStatus: "RESERVED",
        items: [{ id: "p1", quantity: 2 }],
      }

      expect(
        applyOrderInventoryTransition(
          cancelProducts,
          cancelOrder,
          cancelOrder.items ?? [],
          "CANCELLED",
          "2026-09-26T12:00:00.000Z"
        )
      ).toBe("released")
      expect(
        applyOrderInventoryTransition(
          cancelProducts,
          cancelOrder,
          cancelOrder.items ?? [],
          "CANCELLED",
          "2026-09-26T13:00:00.000Z"
        )
      ).toBe("unchanged")
      expect(cancelProducts[0].stock).toBe(5)

      const refundProducts: InventoryProduct[] = [{ id: "p1", stock: 3 }]
      const refundOrder: BankTransferOrder = {
        id: "ORD-CONTRACT-BANK-REFUND",
        status: "CONFIRMED",
        paymentProvider: "BANK_TRANSFER",
        paymentStatus: "PAID",
        inventoryReservationSource: "ORDER",
        inventoryReservationStatus: "RESERVED",
        items: [{ id: "p1", quantity: 2 }],
      }

      expect(
        confirmBankTransferRefund(
          refundProducts,
          refundOrder,
          { id: "admin-contract" },
          "2026-09-26T14:00:00.000Z"
        )
      ).toBe("refunded")
      expect(
        confirmBankTransferRefund(
          refundProducts,
          refundOrder,
          { id: "other-admin" },
          "2026-09-26T15:00:00.000Z"
        )
      ).toBe("unchanged")
      expect(refundProducts[0].stock).toBe(5)
    },
  },
} satisfies Record<PaymentProviderId, PaymentProviderContractHarness>

describe("payment provider contract kit", () => {
  it("requires an explicit harness for every registered provider", () => {
    expect(Object.keys(harnesses).sort()).toEqual(
      [...PAYMENT_PROVIDER_IDS].sort()
    )
  })

  for (const provider of PAYMENT_PROVIDER_IDS) {
    definePaymentProviderContract(harnesses[provider])
  }
})
