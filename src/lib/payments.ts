export type CheckoutPaymentSnapshot = {
  orderId?: string | null
  sessionId: string
  amountTotal: number | null
  currency: string | null
  paymentStatus: string | null
}

export type CheckoutPaymentOrder = {
  id: string
  totalPriceFinal: number
  stripeCheckoutSessionId?: string | null
  paymentStatus?: string | null
}

export type PaymentVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }

export function moneyToMinorUnits(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Nieprawidłowa wartość płatności.")
  }

  return Math.round((value + Number.EPSILON) * 100)
}

export function verifyCheckoutPayment(
  order: CheckoutPaymentOrder,
  snapshot: CheckoutPaymentSnapshot
): PaymentVerificationResult {
  if (snapshot.orderId && snapshot.orderId !== order.id) {
    return { ok: false, reason: "Stripe order_id nie pasuje do zamówienia." }
  }

  if (
    order.stripeCheckoutSessionId &&
    snapshot.sessionId !== order.stripeCheckoutSessionId
  ) {
    return { ok: false, reason: "Sesja Stripe nie pasuje do zamówienia." }
  }

  if ((snapshot.currency || "").toLowerCase() !== "pln") {
    return { ok: false, reason: "Nieprawidłowa waluta płatności Stripe." }
  }

  if (snapshot.amountTotal !== moneyToMinorUnits(order.totalPriceFinal)) {
    return { ok: false, reason: "Kwota Stripe nie pasuje do wartości zamówienia." }
  }

  return { ok: true }
}

export function nextPaymentStatus(
  currentStatus: string | null | undefined,
  incomingStatus: "PAID" | "FAILED" | "EXPIRED"
) {
  if (currentStatus === "PAID") return "PAID"
  return incomingStatus
}
