import fs from "fs"
import path from "path"
import { THEME_CONSTANTS } from "@/types"

const SOLAR_DATA_PATH = path.join(process.cwd(), "src/store/solarData.json")
const WARSAW_COORDS = { lat: 52.2297, lng: 21.0122 }
const WARSAW_TIME_ZONE = "Europe/Warsaw"
const SOLAR_FETCH_TIMEOUT_MS = 5_000
const SOLAR_FAILURE_RETRY_MS = 5 * 60_000

export interface SolarData {
  sunrise: string
  sunset: string
  lastUpdated: string
}

type SolarRuntimeStore = typeof globalThis & {
  __celtronicsSolarCache?: SolarData
  __celtronicsSolarRefresh?: Promise<SolarData>
  __celtronicsSolarRetryAfter?: number
  __celtronicsSolarFailureFallback?: SolarData
}

function isClockTime(value: unknown): value is string {
  if (typeof value !== "string") return false
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

export function isSolarData(value: unknown): value is SolarData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const candidate = value as Partial<SolarData>
  return (
    isClockTime(candidate.sunrise) &&
    isClockTime(candidate.sunset) &&
    typeof candidate.lastUpdated === "string" &&
    Number.isFinite(Date.parse(candidate.lastUpdated))
  )
}

export function isSolarDataFresh(value: SolarData, now = Date.now()) {
  const updatedAt = Date.parse(value.lastUpdated)
  const ageMs = now - updatedAt
  const refreshMs =
    THEME_CONSTANTS.SOLAR_REFRESH_DAYS * 24 * 60 * 60 * 1_000

  return ageMs >= 0 && ageMs < refreshMs
}

function readSeedSolarData(): SolarData | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(SOLAR_DATA_PATH, "utf-8"))
    return isSolarData(parsed) ? parsed : null
  } catch (error) {
    console.warn("Nie udało się odczytać seed cache danych słońca:", error)
    return null
  }
}

function formatWarsawTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error("SOLAR_UPSTREAM_DATE_INVALID")
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: WARSAW_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
}

export function parseSolarApiResponse(
  value: unknown,
  now = new Date()
): SolarData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SOLAR_UPSTREAM_RESPONSE_INVALID")
  }

  const response = value as {
    status?: unknown
    results?: { sunrise?: unknown; sunset?: unknown }
  }

  if (
    response.status !== "OK" ||
    !response.results ||
    typeof response.results.sunrise !== "string" ||
    typeof response.results.sunset !== "string"
  ) {
    throw new Error("SOLAR_UPSTREAM_RESPONSE_INVALID")
  }

  return {
    sunrise: formatWarsawTime(response.results.sunrise),
    sunset: formatWarsawTime(response.results.sunset),
    lastUpdated: now.toISOString(),
  }
}

async function fetchSolarTimes(): Promise<SolarData> {
  const response = await fetch(
    `https://api.sunrise-sunset.org/json?lat=${WARSAW_COORDS.lat}&lng=${WARSAW_COORDS.lng}&formatted=0`,
    { signal: AbortSignal.timeout(SOLAR_FETCH_TIMEOUT_MS) }
  )

  if (!response.ok) {
    throw new Error(`SOLAR_UPSTREAM_HTTP_${response.status}`)
  }

  return parseSolarApiResponse(await response.json())
}

function fallbackSolarData(now = new Date()): SolarData {
  return {
    sunrise: THEME_CONSTANTS.FALLBACK_SUNRISE,
    sunset: THEME_CONSTANTS.FALLBACK_SUNSET,
    lastUpdated: now.toISOString(),
  }
}

function newestSolarData(
  left: SolarData | null,
  right: SolarData | null
): SolarData | null {
  if (!left) return right
  if (!right) return left
  return Date.parse(left.lastUpdated) >= Date.parse(right.lastUpdated)
    ? left
    : right
}

export async function getSolarTimes(): Promise<SolarData> {
  const runtime = globalThis as SolarRuntimeStore
  const memory = isSolarData(runtime.__celtronicsSolarCache)
    ? runtime.__celtronicsSolarCache
    : null

  if (memory && isSolarDataFresh(memory)) return memory

  if (
    typeof runtime.__celtronicsSolarRetryAfter === "number" &&
    runtime.__celtronicsSolarRetryAfter > Date.now() &&
    isSolarData(runtime.__celtronicsSolarFailureFallback)
  ) {
    return runtime.__celtronicsSolarFailureFallback
  }

  const seed = readSeedSolarData()
  if (seed && isSolarDataFresh(seed)) {
    runtime.__celtronicsSolarCache = seed
    return seed
  }

  const stale = newestSolarData(memory, seed)
  if (
    stale &&
    typeof runtime.__celtronicsSolarRetryAfter === "number" &&
    runtime.__celtronicsSolarRetryAfter > Date.now()
  ) {
    return stale
  }

  if (runtime.__celtronicsSolarRefresh) {
    return runtime.__celtronicsSolarRefresh
  }

  const refresh = (async () => {
    try {
      const fresh = await fetchSolarTimes()
      runtime.__celtronicsSolarCache = fresh
      runtime.__celtronicsSolarRetryAfter = undefined
      runtime.__celtronicsSolarFailureFallback = undefined
      return fresh
    } catch (error) {
      console.error("Błąd pobierania danych słońca:", error)
      const failureFallback = stale ?? fallbackSolarData()
      runtime.__celtronicsSolarRetryAfter = Date.now() + SOLAR_FAILURE_RETRY_MS
      runtime.__celtronicsSolarFailureFallback = failureFallback
      return failureFallback
    }
  })()

  runtime.__celtronicsSolarRefresh = refresh

  try {
    return await refresh
  } finally {
    if (runtime.__celtronicsSolarRefresh === refresh) {
      runtime.__celtronicsSolarRefresh = undefined
    }
  }
}
