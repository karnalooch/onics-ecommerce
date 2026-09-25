import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

export const KNOWLEDGE_UPLOAD_ROOT = resolvePersistentPath({
  envName: "CELTRONICS_UPLOAD_ROOT",
  configuredPath: process.env.CELTRONICS_UPLOAD_ROOT,
  developmentFallback: path.join(
    process.cwd(),
    "public",
    "uploads",
    "catalogs"
  ),
})

export const ALLOWED_KNOWLEDGE_EXTENSIONS = new Set([
  ".pdf",
  ".xls",
  ".xlsx",
  ".xlsm",
])

export const MAX_KNOWLEDGE_UPLOAD_BYTES = 25 * 1024 * 1024

export function validateKnowledgeFilename(input: string) {
  const filename = path.basename(String(input || "").trim())

  if (!filename || filename !== input || filename.includes("\0")) {
    throw new Error("Nieprawidłowa nazwa pliku.")
  }

  const extension = path.extname(filename).toLowerCase()
  if (!ALLOWED_KNOWLEDGE_EXTENSIONS.has(extension)) {
    throw new Error("Nieobsługiwany format pliku.")
  }

  return {
    filename,
    extension,
    absolutePath: path.join(KNOWLEDGE_UPLOAD_ROOT, filename),
  }
}
