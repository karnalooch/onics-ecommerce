import { MAX_KNOWLEDGE_UPLOAD_BYTES } from "@/lib/knowledge/files"

export const KNOWLEDGE_UPLOAD_MULTIPART_OVERHEAD_BYTES = 1024 * 1024
export const MAX_KNOWLEDGE_UPLOAD_REQUEST_BYTES =
  MAX_KNOWLEDGE_UPLOAD_BYTES + KNOWLEDGE_UPLOAD_MULTIPART_OVERHEAD_BYTES

export class KnowledgeUploadBodyTooLargeError extends Error {
  constructor() {
    super("KNOWLEDGE_UPLOAD_BODY_TOO_LARGE")
    this.name = "KnowledgeUploadBodyTooLargeError"
  }
}

export class KnowledgeUploadBodyInvalidError extends Error {
  constructor() {
    super("KNOWLEDGE_UPLOAD_BODY_INVALID")
    this.name = "KnowledgeUploadBodyInvalidError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("KNOWLEDGE_UPLOAD_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value) return

  if (!/^\d+$/.test(value)) {
    throw new KnowledgeUploadBodyInvalidError()
  }

  const declared = Number(value)
  if (!Number.isSafeInteger(declared)) {
    throw new KnowledgeUploadBodyTooLargeError()
  }
  if (declared > maxBytes) {
    throw new KnowledgeUploadBodyTooLargeError()
  }
}

function assertMultipartContentType(req: Request) {
  const contentType = req.headers.get("content-type")?.trim() || ""
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new KnowledgeUploadBodyInvalidError()
  }
  return contentType
}

export async function readKnowledgeUploadBody(
  req: Request,
  maxBytes = MAX_KNOWLEDGE_UPLOAD_REQUEST_BYTES
) {
  assertBodyLimit(maxBytes)
  const contentType = assertMultipartContentType(req)
  rejectOversizedDeclaredBody(req, maxBytes)

  if (!req.body) throw new KnowledgeUploadBodyInvalidError()

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new KnowledgeUploadBodyTooLargeError()
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof KnowledgeUploadBodyTooLargeError) throw error
    if (error instanceof KnowledgeUploadBodyInvalidError) throw error
    await reader.cancel().catch(() => undefined)
    throw new KnowledgeUploadBodyInvalidError()
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return { body, contentType }
}

export async function parseBoundedKnowledgeUploadFormData(
  req: Request,
  maxBytes = MAX_KNOWLEDGE_UPLOAD_REQUEST_BYTES
) {
  const { body, contentType } = await readKnowledgeUploadBody(req, maxBytes)

  try {
    const boundedRequest = new Request("http://knowledge-upload.local/", {
      method: "POST",
      headers: {
        "content-type": contentType,
      },
      body,
    })
    return await boundedRequest.formData()
  } catch {
    throw new KnowledgeUploadBodyInvalidError()
  }
}
