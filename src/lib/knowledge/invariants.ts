import type { KnowledgeStore } from "./types"
import {
  hasAmbiguousKnowledgeSourceFilename,
  splitKnowledgeSourceProvenance,
} from "./provenance"

export type KnowledgeUploadFileSnapshot = {
  filename: string
  size: number
  mtimeMs: number
}

type KnowledgeSourceInvariantAuditOptions = {
  store: Pick<KnowledgeStore, "sources" | "processedSources" | "knowledge">
  files: KnowledgeUploadFileSnapshot[]
  now: number
  retentionMs: number
  isSupportedFilename: (filename: string) => boolean
}

function addNormalized(target: Set<string>, value: unknown) {
  if (typeof value !== "string") return
  const normalized = value.trim()
  if (normalized) target.add(normalized)
}

export function collectKnowledgeSourceReferences(
  store: Pick<KnowledgeStore, "sources" | "processedSources" | "knowledge">
) {
  const referenced = new Set<string>()

  for (const source of store.sources) addNormalized(referenced, source)
  for (const source of store.processedSources) addNormalized(referenced, source)

  for (const entry of Object.values(store.knowledge)) {
    for (const source of splitKnowledgeSourceProvenance(entry.source)) {
      addNormalized(referenced, source)
    }
  }

  return Array.from(referenced).sort((left, right) =>
    left.localeCompare(right)
  )
}

export function knowledgeStoreReferencesSource(
  store: Pick<KnowledgeStore, "sources" | "processedSources" | "knowledge">,
  filename: string
) {
  const target = filename.trim()
  if (!target) return false
  return collectKnowledgeSourceReferences(store).includes(target)
}

export function auditKnowledgeSourceInvariants({
  store,
  files,
  now,
  retentionMs,
  isSupportedFilename,
}: KnowledgeSourceInvariantAuditOptions) {
  const referencedSources = collectKnowledgeSourceReferences(store)
  const fileNames = new Set(files.map((file) => file.filename))

  const danglingReferences = referencedSources.filter(
    (source) => !fileNames.has(source)
  )
  const freshOrphans: string[] = []
  const staleOrphans: string[] = []
  const ambiguousLegacyFiles: string[] = []
  const unsupportedFiles: string[] = []

  for (const file of files) {
    if (hasAmbiguousKnowledgeSourceFilename(file.filename)) {
      ambiguousLegacyFiles.push(file.filename)
      continue
    }

    if (!isSupportedFilename(file.filename)) {
      unsupportedFiles.push(file.filename)
      continue
    }

    if (referencedSources.includes(file.filename)) continue

    if (now - file.mtimeMs >= retentionMs) {
      staleOrphans.push(file.filename)
    } else {
      freshOrphans.push(file.filename)
    }
  }

  const sort = (values: string[]) =>
    values.sort((left, right) => left.localeCompare(right))

  sort(danglingReferences)
  sort(freshOrphans)
  sort(staleOrphans)
  sort(ambiguousLegacyFiles)
  sort(unsupportedFiles)

  const manualInterventionRequired =
    danglingReferences.length > 0 ||
    ambiguousLegacyFiles.length > 0 ||
    unsupportedFiles.length > 0

  return {
    ok:
      !manualInterventionRequired &&
      staleOrphans.length === 0,
    manualInterventionRequired,
    referencedSources,
    danglingReferences,
    freshOrphans,
    staleOrphans,
    ambiguousLegacyFiles,
    unsupportedFiles,
  }
}
