export const KNOWLEDGE_SOURCE_DELIMITER = ", "

export function splitKnowledgeSourceProvenance(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return []

  return value
    .split(KNOWLEDGE_SOURCE_DELIMITER)
    .map((source) => source.trim())
    .filter(Boolean)
}

export function knowledgeSourceProvenanceIncludes(
  value: unknown,
  filename: string
) {
  const target = filename.trim()
  if (!target) return false

  return splitKnowledgeSourceProvenance(value).includes(target)
}

export function mergeKnowledgeSourceProvenance(
  current: string | undefined,
  incoming: string | undefined
) {
  const sources = splitKnowledgeSourceProvenance(current)

  for (const source of splitKnowledgeSourceProvenance(incoming)) {
    if (!sources.includes(source)) sources.push(source)
  }

  return sources.length > 0
    ? sources.join(KNOWLEDGE_SOURCE_DELIMITER)
    : undefined
}

export function hasAmbiguousKnowledgeSourceFilename(filename: string) {
  return filename.includes(KNOWLEDGE_SOURCE_DELIMITER)
}
