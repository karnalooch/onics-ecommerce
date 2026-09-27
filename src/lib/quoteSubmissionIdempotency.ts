import { createHash } from "node:crypto"

export function buildQuoteSubmissionFingerprint(input: {
  productId: string
  expectedQuantity: number
  message: string
}) {
  const productId = input.productId.trim()
  const message = input.message.trim()
  const expectedQuantity = Number(input.expectedQuantity)

  if (
    !productId ||
    !Number.isSafeInteger(expectedQuantity) ||
    expectedQuantity < 1
  ) {
    throw new Error("QUOTE_IDEMPOTENCY_PAYLOAD_INVALID")
  }

  return createHash("sha256")
    .update(
      JSON.stringify({
        productId,
        expectedQuantity,
        message,
      }),
      "utf8"
    )
    .digest("hex")
}
