import { describe, expect, it } from "vitest"
import { validateCheckoutPaymentResponse } from "@/lib/checkoutPaymentResponseContract"

describe("checkout payment response contract", () => {
  const REQUEST_ID = "11111111-1111-4111-8111-111111111111"
  it("accepts an HTTPS redirect only for the requested redirect provider", () => {
    expect(
      validateCheckoutPaymentResponse("STRIPE", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-123",
        paymentMethod: "STRIPE",
        nextAction: {
          type: "REDIRECT",
          url: "https://checkout.stripe.com/c/pay/test",
        },
      })
    ).toEqual({
      clientRequestId: REQUEST_ID,
      orderId: "ORD-123",
      paymentMethod: "STRIPE",
      nextAction: {
        type: "REDIRECT",
        url: "https://checkout.stripe.com/c/pay/test",
      },
    })
  })

  it("rejects a missing or malformed client request id", () => {
    expect(() =>
      validateCheckoutPaymentResponse("STRIPE", {
        orderId: "ORD-123",
        paymentMethod: "STRIPE",
        nextAction: {
          type: "REDIRECT",
          url: "https://checkout.stripe.com/c/pay/test",
        },
      })
    ).toThrow(/clientRequestId/)

    expect(() =>
      validateCheckoutPaymentResponse("STRIPE", {
        clientRequestId: "not-a-uuid",
        orderId: "ORD-123",
        paymentMethod: "STRIPE",
        nextAction: {
          type: "REDIRECT",
          url: "https://checkout.stripe.com/c/pay/test",
        },
      })
    ).toThrow(/clientRequestId/)
  })

  it("rejects provider identity and action-kind mismatches", () => {
    expect(() =>
      validateCheckoutPaymentResponse("STRIPE", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-123",
        paymentMethod: "PRZELEWY24",
        nextAction: {
          type: "REDIRECT",
          url: "https://secure.przelewy24.pl/trnRequest/test",
        },
      })
    ).toThrow(/inną metodę/)

    expect(() =>
      validateCheckoutPaymentResponse("BANK_TRANSFER", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-123",
        paymentMethod: "BANK_TRANSFER",
        nextAction: {
          type: "REDIRECT",
          url: "https://example.com",
        },
      })
    ).toThrow(/nieprawidłowy typ akcji/)
  })

  it("rejects unsafe redirect schemes and embedded credentials", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://checkout.example.test/pay",
      "https://user:secret@checkout.example.test/pay",
      "not-a-url",
    ]) {
      expect(() =>
        validateCheckoutPaymentResponse("PRZELEWY24", {
          clientRequestId: REQUEST_ID,
          orderId: "ORD-123",
          paymentMethod: "PRZELEWY24",
          nextAction: { type: "REDIRECT", url },
        })
      ).toThrow(/adres przekierowania|redirect URL/)
    }
  })

  it("accepts and sanitizes a complete manual instruction", () => {
    expect(
      validateCheckoutPaymentResponse("BANK_TRANSFER", {
        clientRequestId: REQUEST_ID,
        orderId: " ORD-456 ",
        paymentMethod: "BANK_TRANSFER",
        nextAction: {
          type: "MANUAL",
          title: " Dane do przelewu ",
          fields: [
            { label: " Odbiorca ", value: " ONICS " },
            { label: " IBAN ", value: " PL123 ", monospace: true },
          ],
          amount: 123.45,
          currency: "pln",
          note: " Zachowaj tytuł ",
        },
      })
    ).toEqual({
      clientRequestId: REQUEST_ID,
      orderId: "ORD-456",
      paymentMethod: "BANK_TRANSFER",
      nextAction: {
        type: "MANUAL",
        title: "Dane do przelewu",
        fields: [
          { label: "Odbiorca", value: "ONICS" },
          { label: "IBAN", value: "PL123", monospace: true },
        ],
        amount: 123.45,
        currency: "PLN",
        note: "Zachowaj tytuł",
      },
    })
  })

  it("rejects malformed manual fields and inconsistent money metadata", () => {
    expect(() =>
      validateCheckoutPaymentResponse("BANK_TRANSFER", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-456",
        paymentMethod: "BANK_TRANSFER",
        nextAction: {
          type: "MANUAL",
          title: "Dane",
          fields: [{ label: "IBAN", value: { unsafe: true } }],
        },
      })
    ).toThrow(/wartości instrukcji/)

    expect(() =>
      validateCheckoutPaymentResponse("BANK_TRANSFER", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-456",
        paymentMethod: "BANK_TRANSFER",
        nextAction: {
          type: "MANUAL",
          title: "Dane",
          fields: [{ label: "IBAN", value: "PL123" }],
          amount: 12.345,
          currency: "PLN",
        },
      })
    ).toThrow(/kwotę/)

    expect(() =>
      validateCheckoutPaymentResponse("BANK_TRANSFER", {
        clientRequestId: REQUEST_ID,
        orderId: "ORD-456",
        paymentMethod: "BANK_TRANSFER",
        nextAction: {
          type: "MANUAL",
          title: "Dane",
          fields: [{ label: "IBAN", value: "PL123" }],
          amount: 12.34,
        },
      })
    ).toThrow(/niepełne dane kwoty/)
  })
})
