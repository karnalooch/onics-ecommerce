import fs from "fs"
import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"
import type { KnowledgeStore } from "@/lib/knowledge/types"
import {
  hasAmbiguousKnowledgeSourceFilename,
  knowledgeSourceProvenanceIncludes,
} from "@/lib/knowledge/provenance"

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
export const MAX_KNOWLEDGE_UPLOAD_STORAGE_BYTES = 250 * 1024 * 1024
export const MAX_KNOWLEDGE_UPLOAD_STORAGE_FILES = 100
export const UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000

export class KnowledgeUploadStorageQuotaError extends Error {
  constructor() {
    super("KNOWLEDGE_UPLOAD_STORAGE_QUOTA")
    this.name = "KnowledgeUploadStorageQuotaError"
  }
}

type KnowledgeUploadStore = Pick<
  KnowledgeStore,
  "sources" | "processedSources" | "knowledge"
>

type PrepareKnowledgeUploadStorageOptions = {
  incomingFilename: string
  incomingBytes: number
  store: KnowledgeUploadStore
  uploadRoot?: string
  now?: number
  maxBytes?: number
  maxFiles?: number
  retentionMs?: number
}

function assertPositiveSafeInteger(value: number, code: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(code)
  }
}

export function knowledgeStoreReferencesUpload(
  store: Pick<KnowledgeStore, "sources" | "processedSources" | "knowledge">,
  filename: string
) {
  const target = filename.trim()
  if (!target) return false

  if (
    store.sources.includes(target) ||
    store.processedSources.includes(target)
  ) {
    return true
  }

  return Object.values(store.knowledge).some((entry) =>
    knowledgeSourceProvenanceIncludes(entry.source, target)
  )
}

export function prepareKnowledgeUploadStorage({
  incomingFilename,
  incomingBytes,
  store,
  uploadRoot = KNOWLEDGE_UPLOAD_ROOT,
  now = Date.now(),
  maxBytes = MAX_KNOWLEDGE_UPLOAD_STORAGE_BYTES,
  maxFiles = MAX_KNOWLEDGE_UPLOAD_STORAGE_FILES,
  retentionMs = UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
}: PrepareKnowledgeUploadStorageOptions) {
  assertPositiveSafeInteger(incomingBytes, "KNOWLEDGE_UPLOAD_SIZE_INVALID")
  assertPositiveSafeInteger(maxBytes, "KNOWLEDGE_UPLOAD_STORAGE_LIMIT_INVALID")
  assertPositiveSafeInteger(maxFiles, "KNOWLEDGE_UPLOAD_STORAGE_LIMIT_INVALID")
  assertPositiveSafeInteger(retentionMs, "KNOWLEDGE_UPLOAD_RETENTION_INVALID")

  const safeIncomingFilename = path.basename(incomingFilename)
  if (
    !safeIncomingFilename ||
    safeIncomingFilename !== incomingFilename ||
    incomingFilename.includes("\0")
  ) {
    throw new Error("Nieprawidłowa nazwa pliku.")
  }

  fs.mkdirSync(uploadRoot, { recursive: true })

  const files = fs
    .readdirSync(uploadRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const absolutePath = path.join(uploadRoot, entry.name)
      const stat = fs.statSync(absolutePath)
      return {
        filename: entry.name,
        absolutePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        referenced: knowledgeStoreReferencesUpload(store, entry.name),
      }
    })

  let totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  let fileCount = files.length
  const removed: string[] = []

  const removable = files
    .filter(
      (file) =>
        !file.referenced &&
        file.filename !== safeIncomingFilename
    )
    .sort(
      (left, right) =>
        left.mtimeMs - right.mtimeMs ||
        left.filename.localeCompare(right.filename)
    )

  const removeFile = (file: (typeof removable)[number]) => {
    fs.rmSync(file.absolutePath, { force: true })
    totalBytes -= file.size
    fileCount -= 1
    removed.push(file.filename)
  }

  for (const file of removable) {
    if (now - file.mtimeMs >= retentionMs) {
      removeFile(file)
    }
  }

  const alreadyRemoved = new Set(removed)
  for (const file of removable) {
    if (
      totalBytes + incomingBytes <= maxBytes &&
      fileCount + 1 <= maxFiles
    ) {
      break
    }
    if (!alreadyRemoved.has(file.filename)) {
      removeFile(file)
      alreadyRemoved.add(file.filename)
    }
  }

  if (
    totalBytes + incomingBytes > maxBytes ||
    fileCount + 1 > maxFiles
  ) {
    throw new KnowledgeUploadStorageQuotaError()
  }

  return {
    removed,
    totalBytes,
    fileCount,
  }
}

export async function canSafelyRemoveFailedKnowledgeUpload(
  filename: string,
  loadStore: () => Promise<KnowledgeStore>
) {
  try {
    const store = await loadStore()
    return !knowledgeStoreReferencesUpload(store, filename)
  } catch {
    return false
  }
}

export function validateKnowledgeFilename(input: string) {
  const filename = path.basename(String(input || "").trim())

  if (
    !filename ||
    filename !== input ||
    filename.includes("\0") ||
    hasAmbiguousKnowledgeSourceFilename(filename)
  ) {
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
