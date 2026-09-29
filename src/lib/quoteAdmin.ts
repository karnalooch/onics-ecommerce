import { z } from "zod"

const QuotedQuoteUpdateSchema = z
  .object({
    id: z.string().min(1),
    expectedStatus: z.enum(["PENDING", "INQUIRY"]),
    status: z.literal("QUOTED"),
    deliveryTimeDays: z.coerce.number().int().min(1).max(365),
    additionalDiscount: z.coerce.number().min(0).max(100).default(0),
  })
  .strict()

const RejectedQuoteUpdateSchema = z
  .object({
    id: z.string().min(1),
    expectedStatus: z.enum(["PENDING", "INQUIRY"]),
    status: z.literal("REJECTED"),
    deliveryTimeDays: z.null().optional(),
    additionalDiscount: z
      .coerce.number()
      .refine((value) => value === 0, "Odrzucona wycena nie może mieć rabatu.")
      .default(0),
  })
  .strict()

export const AdminQuoteUpdateSchema = z.discriminatedUnion("status", [
  QuotedQuoteUpdateSchema,
  RejectedQuoteUpdateSchema,
])

export type AdminQuoteUpdate = z.infer<typeof AdminQuoteUpdateSchema>

type StoredQuoteAdminState = {
  status?: string | null
  deliveryTimeDays?: number | null
  additionalDiscount?: number | null
}

export function isQuoteAdminUpdateReplay(
  current: unknown,
  requested: AdminQuoteUpdate
) {
  const state = (current ?? {}) as StoredQuoteAdminState
  if (state.status !== requested.status) return false

  if (requested.status === "QUOTED") {
    return (
      Number(state.deliveryTimeDays) === requested.deliveryTimeDays &&
      Number(state.additionalDiscount ?? 0) ===
        requested.additionalDiscount
    )
  }

  return (
    (state.deliveryTimeDays ?? null) === null &&
    Number(state.additionalDiscount ?? 0) === 0
  )
}

export function assertQuoteAdminExpectedStatus(
  currentStatus: unknown,
  expectedStatus: AdminQuoteUpdate["expectedStatus"]
) {
  if (currentStatus !== expectedStatus) {
    throw new Error("QUOTE_STATUS_CONFLICT")
  }
}

export function isQuoteAdminActionable(currentStatus: unknown) {
  return currentStatus === "PENDING" || currentStatus === "INQUIRY"
}

export function assertQuoteAdminTransition(currentStatus: unknown) {
  if (!isQuoteAdminActionable(currentStatus)) {
    throw new Error("QUOTE_NOT_ACTIONABLE")
  }
}

export function requireQuoteBasePrice(price: unknown) {
  const basePrice = Number(price)

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new Error("QUOTE_PRODUCT_NOT_PRICED")
  }

  return basePrice
}

export function requirePositiveQuoteTotal(total: unknown) {
  const finalTotal = Number(total)

  if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
    throw new Error("QUOTE_TOTAL_NOT_POSITIVE")
  }

  return finalTotal
}
