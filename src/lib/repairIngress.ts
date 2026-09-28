export const REPAIR_MAX_BODY_BYTES = 16 * 1024

export class RepairBodyTooLargeError extends Error {
  constructor() {
    super("REPAIR_BODY_TOO_LARGE")
    this.name = "RepairBodyTooLargeError"
  }
}

export class RepairBodyInvalidError extends Error {
  constructor() {
    super("REPAIR_BODY_INVALID")
    this.name = "RepairBodyInvalidError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("REPAIR_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return

  const declared = Number(value)
  if (!Number.isSafeInteger(declared) || declared > maxBytes) {
    throw new RepairBodyTooLargeError()
  }
}

export async function readRepairBody(
  req: Request,
  maxBytes = REPAIR_MAX_BODY_BYTES
) {
  assertBodyLimit(maxBytes)
  rejectOversizedDeclaredBody(req, maxBytes)

  if (!req.body) return ""

  const reader = req.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let bytesRead = 0
  let body = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RepairBodyTooLargeError()
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return body
  } catch (error) {
    if (error instanceof RepairBodyTooLargeError) throw error
    await reader.cancel().catch(() => undefined)
    throw new RepairBodyInvalidError()
  } finally {
    reader.releaseLock()
  }
}

export async function readRepairJson(
  req: Request,
  maxBytes = REPAIR_MAX_BODY_BYTES
): Promise<unknown> {
  const rawBody = await readRepairBody(req, maxBytes)

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new RepairBodyInvalidError()
  }
}
