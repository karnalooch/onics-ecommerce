import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

type KnowledgeUploadRootOptions = {
  configuredPath?: string | null
  nodeEnv?: string
  cwd?: string
}

function isInsideDirectory(candidatePath: string, directoryPath: string) {
  const relative = path.relative(directoryPath, candidatePath)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

export function resolveKnowledgeUploadRoot({
  configuredPath = process.env.CELTRONICS_UPLOAD_ROOT,
  nodeEnv = process.env.NODE_ENV,
  cwd = process.cwd(),
}: KnowledgeUploadRootOptions = {}) {
  const uploadRoot = resolvePersistentPath({
    envName: "CELTRONICS_UPLOAD_ROOT",
    configuredPath,
    developmentFallback: path.join(cwd, ".local", "celtronics", "uploads"),
    nodeEnv,
  })
  const publicRoot = path.resolve(cwd, "public")

  if (isInsideDirectory(uploadRoot, publicRoot)) {
    throw new Error(
      "CELTRONICS_UPLOAD_ROOT nie może wskazywać katalogu public/ ani jego podkatalogu."
    )
  }

  return uploadRoot
}

export const KNOWLEDGE_UPLOAD_ROOT = resolveKnowledgeUploadRoot()

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
