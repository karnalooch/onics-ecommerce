export type FieldProductSearchRecord = {
  sku?: string | null
  name?: string | null
  manufacturer?: string | null
  categoryName?: string | null
  subcategoryName?: string | null
  description?: string | null
}

export type FieldTechnicalFact = {
  label: string
  value: string
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
}

function pushFact(
  target: FieldTechnicalFact[],
  seen: Set<string>,
  label: string,
  value: string | undefined
) {
  const normalized = normalizeText(value)
  if (!normalized || seen.has(label)) return
  seen.add(label)
  target.push({ label, value: normalized })
}

export function extractTechnicalFacts(description: string) {
  const text = normalizeText(description)
  const facts: FieldTechnicalFact[] = []
  const seen = new Set<string>()

  const resolution = text.match(/\b(\d+(?:[.,]\d+)?)\s*MP\b/i)
  pushFact(
    facts,
    seen,
    "Rozdzielczość",
    resolution?.[1] ? resolution[1] + " MP" : undefined
  )

  if (/\bPoE\b/i.test(text)) {
    const poeStandard = text.match(/\b802\.3(?:af|at|bt)\b/i)
    pushFact(facts, seen, "PoE", poeStandard?.[0] || "TAK")
  }

  const ipRating = text.match(/\bIP\d{2}\b/i)
  pushFact(facts, seen, "Odporność", ipRating?.[0]?.toUpperCase())

  const lens = text.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/i)
  pushFact(
    facts,
    seen,
    "Optyka / wymiar",
    lens?.[1] ? lens[1] + " mm" : undefined
  )

  const channels = text.match(/\b(\d{1,3})\s*(?:kana(?:ł|ły|łów)|CH)\b/i)
  pushFact(facts, seen, "Kanały", channels?.[1])

  const sata = text.match(/\b(\d{1,2})\s*[x×]\s*SATA\b/i)
  pushFact(facts, seen, "Dyski", sata?.[1] ? sata[1] + " × SATA" : undefined)

  const capacity = text.match(/\b(\d+(?:[.,]\d+)?)\s*TB\b/i)
  pushFact(
    facts,
    seen,
    "Pojemność",
    capacity?.[1] ? capacity[1] + " TB" : undefined
  )

  const throughput = text.match(/\b(\d+)\s*Mb\/s\b/i)
  pushFact(
    facts,
    seen,
    "Przepustowość",
    throughput?.[1] ? throughput[1] + " Mb/s" : undefined
  )

  const voltage = text.match(/\b(\d+(?:[.,]\d+)?)\s*V(?:DC|AC)?\b/i)
  pushFact(facts, seen, "Zasilanie", voltage?.[0]?.toUpperCase())

  const range = text.match(/\b(?:IR|zasi[eę]g)[^\d]{0,12}(\d+)\s*m\b/i)
  pushFact(facts, seen, "Zasięg", range?.[1] ? range[1] + " m" : undefined)

  const ean = text.match(/\b(\d{8,14})\b/)
  pushFact(facts, seen, "EAN / kod", ean?.[1])

  return facts.slice(0, 8)
}

export function extractVerifiedProcedure(text: string) {
  const source = String(text ?? "")
  const candidates = source
    .split(/\r?\n|(?=\bKrok\s+\d+[:.)-])|(?=\b\d{1,2}[.)]\s+)/i)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const steps: string[] = []

  for (const candidate of candidates) {
    const match = candidate.match(
      /^(?:Krok\s+\d+[:.)-]?|\d{1,2}[.)])\s*(.+)$/i
    )
    const step = normalizeText(match?.[1])
    if (step && step.length >= 3 && step.length <= 240) {
      steps.push(step)
    }
  }

  return steps.slice(0, 12)
}

export function buildFieldSearchText(product: FieldProductSearchRecord) {
  return [
    product.sku,
    product.name,
    product.manufacturer,
    product.categoryName,
    product.subcategoryName,
    product.description,
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(" ")
}

export function scoreFieldProduct(
  product: FieldProductSearchRecord,
  query: string
) {
  const normalizedQuery = normalizeText(query).toLowerCase()
  if (!normalizedQuery) return 1

  const sku = normalizeText(product.sku).toLowerCase()
  const name = normalizeText(product.name).toLowerCase()
  const haystack = buildFieldSearchText(product)
  const tokens = normalizedQuery.split(" ").filter(Boolean)

  if (!tokens.every((token) => haystack.includes(token))) return -1
  if (sku === normalizedQuery) return 1000
  if (sku.startsWith(normalizedQuery)) return 700
  if (name === normalizedQuery) return 650
  if (name.startsWith(normalizedQuery)) return 500

  return 100 + tokens.length * 10
}
