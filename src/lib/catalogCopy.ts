/** Catalog copy only: never infer a brand, specification, price or classification. */
export type CatalogCopyRecord = {
  name?: string | null
  sku?: string | null
  specs?: string | null
  catalogSpecs?: string | null
  seoDescription?: string | null
}

const EMPTY_COPY = /^(?:parametry standardowe|brak opisu|brak danych|n\/?a|-)?[.!]?$/iu
const ENTITIES: Record<string, string> = {
  nbsp: " ", quot: '"', apos: "'", amp: "&", lt: "<", gt: ">",
  ndash: "–", mdash: "—", deg: "°", times: "×", oslash: "ø", Oslash: "Ø",
}

function decodeTextEntities(value: string): string {
  return value
    .replace(/&(nbsp|quot|apos|amp|lt|gt|ndash|mdash|deg|times|oslash|Oslash);/g, (_, key: string) => ENTITIES[key])
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (entity, code: string) => {
      const number = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code)
      return number >= 32 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
        ? String.fromCodePoint(number) : entity
    })
}

function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(/[\s\u00a0\u202f]+/gu, " ")
    .replace(/(bariera podczerwieni) -(?=\d+ wiąz)/giu, "$1 – ")
    .trim()
}

export function cleanCatalogText(value: unknown): string {
  if (typeof value !== "string") return ""
  const original = normalizeWhitespace(value)
  let text = original
  // Decode to a fixed point or preserve the input; never partially decode an
  // arbitrarily nested entity that would change again on the next invocation.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = normalizeWhitespace(decodeTextEntities(text))
    if (next === text) return text
    text = next
  }
  return original
}

/** Remove the observed currency + four binary import columns + optional barcode tail.
 * Binary column meanings are unknown: do not turn them into product/stock facts.
 * Original values remain in the seed migration report and Git history.
 */
export function cleanCatalogDescription(value: unknown): string {
  let text = cleanCatalogText(value)
  if (EMPTY_COPY.test(text)) return ""
  let barcode = ""
  text = text.replace(/\s*\|\s*PLN\s*\|\s*[01]\s*\|\s*[01]\s*\|\s*[01]\s*\|\s*[01](?:\s*\|\s*(\d{8}|\d{12,14}))?\s*$/u,
    (_match, captured: string | undefined) => {
      barcode = captured ?? ""
      return ""
    })
  // The source contains "do128" and "7Ah". Do not touch model codes/hyphens.
  text = text.replace(/\bdo(?=\d)/gu, "do ")
    .replace(/(?<![\p{L}\p{N}_-])(\d+(?:[,.]\d+)?)(mAh|Ah)(?=[\s,;.)]|$)/gu, "$1 $2")
    .replace(/\s+([,;])/gu, "$1")
    .trim()
  if (EMPTY_COPY.test(text)) text = ""
  if (barcode) return `${text}${text && !/[.!?]$/u.test(text) ? "." : ""}${text ? " " : ""}EAN: ${barcode}`
  return text
}

function titleLead(description: string, sku: string): string {
  const source = description.replace(/\s*EAN:\s*\d+\s*$/u, "").trim()
  let lead = source.split(/\s*\(|\s*\||;|,(?!\d)/u)[0].replace(/[.!?]+$/u, "").trim()
  // Avoid repeating the exact model when the source already spells it out.
  const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (escaped) lead = lead.replace(new RegExp(`(?<![\\p{L}\\p{N}_-])${escaped}(?![\\p{L}\\p{N}_-])`, "gu"), "").replace(/\s+/gu, " ").trim()
  if (!lead) return ""
  if (/^\p{Lu}\p{Ll}/u.test(lead)) lead = lead[0].toLocaleLowerCase("pl") + lead.slice(1)
  const maxLead = Math.max(24, 140 - sku.length - 3)
  if (lead.length > maxLead) {
    const boundary = lead.lastIndexOf(" ", maxLead - 1)
    lead = `${lead.slice(0, boundary > 0 ? boundary : maxLead - 1).trimEnd()}…`
  }
  return lead
}

export function normalizeCatalogProductCopy<T extends CatalogCopyRecord>(product: T): T {
  const next = { ...product }
  if (typeof product.name === "string") next.name = cleanCatalogText(product.name)
  if (typeof product.specs === "string") next.specs = cleanCatalogDescription(product.specs)
  const sku = cleanCatalogText(product.sku)
  const currentName = cleanCatalogText(product.name)
  if (sku && (!currentName || currentName.toLocaleLowerCase("pl") === sku.toLocaleLowerCase("pl"))) {
    const description = [product.specs, product.catalogSpecs, product.seoDescription]
      .map(cleanCatalogDescription).find(Boolean) ?? ""
    const lead = titleLead(description, sku)
    if (lead) next.name = `${sku} — ${lead}`
  }
  return next
}
