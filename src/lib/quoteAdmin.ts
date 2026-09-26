import { z } from "zod"

const QuotedQuoteUpdateSchema = z
  .object({
    id: z.string().min(1),
    status: z.literal("QUOTED"),
    deliveryTimeDays: z.coerce.number().int().min(1).max(365),
    additionalDiscount: z.coerce.number().min(0).max(100).default(0),
  })
  .strict()

const RejectedQuoteUpdateSchema = z
  .object({
    id: z.string().min(1),
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

export function assertQuoteAdminTransition(currentStatus: unknown) {
  if (currentStatus !== "PENDING" && currentStatus !== "INQUIRY") {
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
