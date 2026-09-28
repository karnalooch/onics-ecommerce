import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  isSolarData,
  isSolarDataFresh,
  parseSolarApiResponse,
} from "../solarUtils"

describe("solar data hardening", () => {
  it("formats upstream timestamps in Europe/Warsaw rather than server local time", () => {
    const parsed = parseSolarApiResponse(
      {
        status: "OK",
        results: {
          sunrise: "2026-06-01T02:30:00+00:00",
          sunset: "2026-06-01T18:45:00+00:00",
        },
      },
      new Date("2026-06-01T12:00:00.000Z")
    )

    expect(parsed).toEqual({
      sunrise: "04:30",
      sunset: "20:45",
      lastUpdated: "2026-06-01T12:00:00.000Z",
    })
  })

  it("fails closed on malformed upstream payloads and cache values", () => {
    expect(() =>
      parseSolarApiResponse({
        status: "OK",
        results: { sunrise: "not-a-date", sunset: "2026-06-01T18:45:00Z" },
      })
    ).toThrow("SOLAR_UPSTREAM_DATE_INVALID")

    expect(isSolarData({ sunrise: "25:00", sunset: "18:00", lastUpdated: new Date().toISOString() })).toBe(false)
    expect(isSolarData({ sunrise: "05:30", sunset: "18:00", lastUpdated: "invalid" })).toBe(false)
  })

  it("does not treat future timestamps as a permanently fresh cache", () => {
    expect(
      isSolarDataFresh(
        {
          sunrise: "05:30",
          sunset: "18:00",
          lastUpdated: "2026-06-02T00:00:00.000Z",
        },
        Date.parse("2026-06-01T00:00:00.000Z")
      )
    ).toBe(false)
  })

  it("keeps the solar runtime path read-only and bounds the upstream request", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/solarUtils.ts"),
      "utf8"
    )

    expect(source).toContain("AbortSignal.timeout(SOLAR_FETCH_TIMEOUT_MS)")
    expect(source).toContain('timeZone: WARSAW_TIME_ZONE')
    expect(source).toContain("const failureFallback = stale ?? fallbackSolarData()")
    expect(source).toContain("runtime.__celtronicsSolarFailureFallback = failureFallback")
    expect(source).not.toContain("writeFileSync(")
    expect(source).not.toContain("mkdirSync(")
  })
})
