import { describe, expect, it } from "vitest"
import {
  KnowledgeUploadBodyInvalidError,
  KnowledgeUploadBodyTooLargeError,
  parseBoundedKnowledgeUploadFormData,
  readKnowledgeUploadBody,
} from "@/lib/knowledge/uploadIngress"

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

describe("knowledge upload ingress", () => {
  it("rejects an oversized declared Content-Length before consuming multipart", async () => {
    const req = requestWithChunks([bytes("small")], {
      "content-type": "multipart/form-data; boundary=test",
      "content-length": "100",
    })

    await expect(readKnowledgeUploadBody(req, 10)).rejects.toBeInstanceOf(
      KnowledgeUploadBodyTooLargeError
    )
  })

  it("enforces the actual streamed byte count when Content-Length is understated", async () => {
    const req = requestWithChunks([bytes("12345"), bytes("67890")], {
      "content-type": "multipart/form-data; boundary=test",
      "content-length": "1",
    })

    await expect(readKnowledgeUploadBody(req, 9)).rejects.toBeInstanceOf(
      KnowledgeUploadBodyTooLargeError
    )
  })

  it("rejects malformed or non-multipart content types", async () => {
    const req = requestWithChunks([bytes("{}")], {
      "content-type": "application/json",
    })

    await expect(readKnowledgeUploadBody(req, 100)).rejects.toBeInstanceOf(
      KnowledgeUploadBodyInvalidError
    )
  })

  it("parses multipart only after the bounded body was fully accepted", async () => {
    const boundary = "knowledge-boundary"
    const multipart = [
      `--${boundary}\r\n`,
      'Content-Disposition: form-data; name="apiKey"\r\n',
      "\r\n",
      "transient-key\r\n",
      `--${boundary}\r\n`,
      'Content-Disposition: form-data; name="file"; filename="catalog.pdf"\r\n',
      "Content-Type: application/pdf\r\n",
      "\r\n",
      "catalog\r\n",
      `--${boundary}--\r\n`,
    ].join("")

    const original = requestWithChunks([bytes(multipart)], {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    })
    const parsed = await parseBoundedKnowledgeUploadFormData(original, 4096)
    const file = parsed.get("file")

    expect(parsed.get("apiKey")).toBe("transient-key")
    expect(file).toBeInstanceOf(File)
    expect((file as File).name).toBe("catalog.pdf")
    expect(await (file as File).text()).toBe("catalog")
  })

  it("fails closed on a missing request body", async () => {
    const req = {
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=test",
      }),
      body: null,
    } as Request

    await expect(readKnowledgeUploadBody(req, 100)).rejects.toBeInstanceOf(
      KnowledgeUploadBodyInvalidError
    )
  })
})
