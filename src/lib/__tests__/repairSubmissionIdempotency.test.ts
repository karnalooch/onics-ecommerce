import { describe, expect, it } from "vitest"
import { buildRepairSubmissionFingerprint } from "@/lib/repairSubmissionIdempotency"

describe("repair submission idempotency", () => {
  it("canonicalizes surrounding whitespace", () => {
    expect(
      buildRepairSubmissionFingerprint({
        client: " Partner ",
        item: " Sterownik ",
        serial: " SN-1 ",
        description: " Nie uruchamia się ",
      })
    ).toBe(
      buildRepairSubmissionFingerprint({
        client: "Partner",
        item: "Sterownik",
        serial: "SN-1",
        description: "Nie uruchamia się",
      })
    )
  })

  it("binds the key to every immutable submission field", () => {
    const base = buildRepairSubmissionFingerprint({
      client: "Partner",
      item: "Sterownik",
      serial: "SN-1",
      description: "Nie uruchamia się",
    })

    for (const input of [
      {
        client: "Inny partner",
        item: "Sterownik",
        serial: "SN-1",
        description: "Nie uruchamia się",
      },
      {
        client: "Partner",
        item: "Inny sterownik",
        serial: "SN-1",
        description: "Nie uruchamia się",
      },
      {
        client: "Partner",
        item: "Sterownik",
        serial: "SN-2",
        description: "Nie uruchamia się",
      },
      {
        client: "Partner",
        item: "Sterownik",
        serial: "SN-1",
        description: "Inny opis",
      },
    ]) {
      expect(buildRepairSubmissionFingerprint(input)).not.toBe(base)
    }
  })

  it("allows the admin flow to keep an empty description", () => {
    expect(
      buildRepairSubmissionFingerprint({
        client: "Partner",
        item: "Sterownik",
        serial: "SN-1",
        description: "",
      })
    ).toMatch(/^[0-9a-f]{64}$/)
  })

  it("rejects missing repair identity", () => {
    expect(() =>
      buildRepairSubmissionFingerprint({
        item: "",
        serial: "SN-1",
        description: "Opis",
      })
    ).toThrow("REPAIR_IDEMPOTENCY_PAYLOAD_INVALID")

    expect(() =>
      buildRepairSubmissionFingerprint({
        item: "Sterownik",
        serial: "",
        description: "Opis",
      })
    ).toThrow("REPAIR_IDEMPOTENCY_PAYLOAD_INVALID")
  })
})
