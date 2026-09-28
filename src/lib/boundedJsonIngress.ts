export const AUTHENTICATED_JSON_MAX_BODY_BYTES = 256 * 1024

export type BoundedJsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "too-large" | "invalid" }

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("AUTHENTICATED_JSON_BODY_LIMIT_INVALID")
  }
}

function declaredBodyTooLarge(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return false

  const declared = Number(value)
  return !Number.isSafeInteger(declared) || declared > maxBytes
}

export async function readBoundedJson(
  req: Request,
  maxBytes = AUTHENTICATED_JSON_MAX_BODY_BYTES
): Promise<BoundedJsonReadResult> {
  assertBodyLimit(maxBytes)

  if (declaredBodyTooLarge(req, maxBytes)) {
    return { ok: false, error: "too-large" }
  }

  if (!req.body) {
    return { ok: false, error: "invalid" }
  }

  const reader = req.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let bytesRead = 0
  let rawBody = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return { ok: false, error: "too-large" }
      }

      rawBody += decoder.decode(value, { stream: true })
    }

    rawBody += decoder.decode()
  } catch {
    await reader.cancel().catch(() => undefined)
    return { ok: false, error: "invalid" }
  } finally {
    reader.releaseLock()
  }

  try {
    return { ok: true, value: JSON.parse(rawBody) }
  } catch {
    return { ok: false, error: "invalid" }
  }
}
