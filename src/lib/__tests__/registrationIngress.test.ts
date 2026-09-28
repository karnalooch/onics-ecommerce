import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  RegistrationBodyInvalidError,
  RegistrationBodyTooLargeError,
  readRegistrationBody,
  readRegistrationJson,
} from "../registrationIngress"

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

describe("registration ingress", () => {
  it("rejects an oversized declared Content-Length before reading the body", async () => {
    const request = requestWithChunks([bytes("{}")], {
      "content-length": "5",
    })

    await expect(readRegistrationBody(request, 4)).rejects.toBeInstanceOf(
      RegistrationBodyTooLargeError
    )
  })

  it("enforces the streamed byte limit when Content-Length is missing", async () => {
    const request = requestWithChunks([bytes('{"a":'), bytes('"x"}')])

    await expect(readRegistrationBody(request, 8)).rejects.toBeInstanceOf(
      RegistrationBodyTooLargeError
    )
  })

  it("does not trust an understated Content-Length", async () => {
    const request = requestWithChunks([bytes('{"oversized":true}')], {
      "content-length": "2",
    })

    await expect(readRegistrationBody(request, 8)).rejects.toBeInstanceOf(
      RegistrationBodyTooLargeError
    )
  })

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const request = requestWithChunks([new Uint8Array([0xff])])

    await expect(readRegistrationBody(request, 8)).rejects.toBeInstanceOf(
      RegistrationBodyInvalidError
    )
  })

  it("rejects malformed JSON after bounded decoding", async () => {
    const request = requestWithChunks([bytes('{"email":')])

    await expect(readRegistrationJson(request, 32)).rejects.toBeInstanceOf(
      RegistrationBodyInvalidError
    )
  })

  it("parses valid JSON within the configured limit", async () => {
    const raw = '{"ok":true}'
    const request = requestWithChunks([bytes(raw)])

    await expect(readRegistrationJson(request, bytes(raw).byteLength)).resolves.toEqual({
      ok: true,
    })
  })

  it("wires the public registration route through the bounded reader", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/register/route.ts"),
      "utf8"
    )

    expect(source).toContain("readRegistrationJson(req)")
    expect(source).not.toContain("RegistrationSchema.safeParse(await req.json())")
    expect(source).toContain("RegistrationBodyTooLargeError")
    expect(source).toContain("{ status: 413 }")
  })
})
