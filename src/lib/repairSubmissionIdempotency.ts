import { createHash } from "node:crypto"

export type RepairSubmissionInput = {
  client?: string | null
  item: string
  serial: string
  description: string
}

function normalizedText(value: string | null | undefined) {
  return String(value ?? "").trim()
}

export function buildRepairSubmissionFingerprint(
  input: RepairSubmissionInput
) {
  const client = normalizedText(input.client)
  const item = normalizedText(input.item)
  const serial = normalizedText(input.serial)
  const description = normalizedText(input.description)

  if (!item || !serial) {
    throw new Error("REPAIR_IDEMPOTENCY_PAYLOAD_INVALID")
  }

  return createHash("sha256")
    .update(
      JSON.stringify({
        ...(client ? { client } : {}),
        item,
        serial,
        description,
      }),
      "utf8"
    )
    .digest("hex")
}
