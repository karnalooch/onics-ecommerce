import { describe, expect, it } from "vitest"
import {
  RepairBodyInvalidError,
  RepairBodyTooLargeError,
  readRepairJson,
} from "@/lib/repairIngress"

describe("repair ingress", () => {
  it("rejects an oversized declared body without consuming it", async () => {
    const request = new Request("https://example.test/api/repairs", {
      method: "POST",
      headers: { "content-length": "17" },
      body: "{}",
    })

    await expect(readRepairJson(request, 16)).rejects.toBeInstanceOf(
      RepairBodyTooLargeError
    )
  })

  it("rejects a chunked body once the byte budget is exceeded", async () => {
    const request = new Request("https://example.test/api/repairs", {
      method: "POST",
      body: JSON.stringify({ description: "x".repeat(128) }),
    })

    await expect(readRepairJson(request, 32)).rejects.toBeInstanceOf(
      RepairBodyTooLargeError
    )
  })

  it("fails closed on malformed JSON and invalid UTF-8", async () => {
    const malformed = new Request("https://example.test/api/repairs", {
      method: "POST",
      body: "{",
    })
    await expect(readRepairJson(malformed)).rejects.toBeInstanceOf(
      RepairBodyInvalidError
    )

    const invalidUtf8 = new Request("https://example.test/api/repairs", {
      method: "POST",
      body: new Uint8Array([0xc3, 0x28]),
    })
    await expect(readRepairJson(invalidUtf8)).rejects.toBeInstanceOf(
      RepairBodyInvalidError
    )
  })
})
