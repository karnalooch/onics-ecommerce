import { describe, expect, it } from "vitest"
import {
  OrderImportBodyInvalidError,
  OrderImportBodyTooLargeError,
  readOrderImportBody,
} from "../orderImportIngress"

function requestWithChunks(
  chunks: Uint8Array[],
  headers: Record<string, string> = {}
) {
  return {
    headers: new Headers(headers),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    }),
  } as Request
}

const bytes = (value: string) => new TextEncoder().encode(value)

describe("order import ingress", () => {
  it("rejects an oversized declared Content-Length before reading the body", async () => {
    const request = requestWithChunks([bytes("ok")], {
      "content-length": "5",
    })

    await expect(readOrderImportBody(request, 4)).rejects.toBeInstanceOf(
      OrderImportBodyTooLargeError
    )
  })

  it("enforces the streamed byte limit when Content-Length is missing", async () => {
    const request = requestWithChunks([bytes("ab"), bytes("cde")])

    await expect(readOrderImportBody(request, 4)).rejects.toBeInstanceOf(
      OrderImportBodyTooLargeError
    )
  })

  it("does not trust an understated Content-Length", async () => {
    const request = requestWithChunks([bytes("abcde")], {
      "content-length": "1",
    })

    await expect(readOrderImportBody(request, 4)).rejects.toBeInstanceOf(
      OrderImportBodyTooLargeError
    )
  })

  it("accepts a body exactly at the configured byte limit", async () => {
    const request = requestWithChunks([bytes("ab"), bytes("cd")])

    await expect(readOrderImportBody(request, 4)).resolves.toBe("abcd")
  })

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const request = requestWithChunks([new Uint8Array([0xff])])

    await expect(readOrderImportBody(request, 4)).rejects.toBeInstanceOf(
      OrderImportBodyInvalidError
    )
  })
})
