export const REGISTRATION_MAX_BODY_BYTES = 16 * 1024

export class RegistrationBodyTooLargeError extends Error {
  constructor() {
    super("REGISTRATION_BODY_TOO_LARGE")
    this.name = "RegistrationBodyTooLargeError"
  }
}

export class RegistrationBodyInvalidError extends Error {
  constructor() {
    super("REGISTRATION_BODY_INVALID")
    this.name = "RegistrationBodyInvalidError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("REGISTRATION_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return

  const declared = Number(value)
  if (!Number.isSafeInteger(declared) || declared > maxBytes) {
    throw new RegistrationBodyTooLargeError()
  }
}

export async function readRegistrationBody(
  req: Request,
  maxBytes = REGISTRATION_MAX_BODY_BYTES
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
        throw new RegistrationBodyTooLargeError()
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return body
  } catch (error) {
    if (error instanceof RegistrationBodyTooLargeError) throw error
    await reader.cancel().catch(() => undefined)
    throw new RegistrationBodyInvalidError()
  } finally {
    reader.releaseLock()
  }
}

export async function readRegistrationJson(
  req: Request,
  maxBytes = REGISTRATION_MAX_BODY_BYTES
): Promise<unknown> {
  const rawBody = await readRegistrationBody(req, maxBytes)

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new RegistrationBodyInvalidError()
  }
}
