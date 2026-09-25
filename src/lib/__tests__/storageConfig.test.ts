import path from "path"
import { describe, expect, it } from "vitest"
import { resolvePersistentPath } from "@/lib/storageConfig"

describe("production storage configuration", () => {
  it("uses an explicit configured path in production", () => {
    expect(
      resolvePersistentPath({
        envName: "CELTRONICS_DB_PATH",
        configuredPath: "./var/celtronics/db.json",
        developmentFallback: "./src/data/db.json",
        nodeEnv: "production",
      })
    ).toBe(path.resolve("./var/celtronics/db.json"))
  })

  it("allows a local fallback outside production", () => {
    expect(
      resolvePersistentPath({
        envName: "CELTRONICS_DB_PATH",
        developmentFallback: "./src/data/db.json",
        nodeEnv: "development",
      })
    ).toBe(path.resolve("./src/data/db.json"))
  })

  it("fails closed when persistent storage is missing in production", () => {
    expect(() =>
      resolvePersistentPath({
        envName: "CELTRONICS_DB_PATH",
        configuredPath: "   ",
        developmentFallback: "./src/data/db.json",
        nodeEnv: "production",
      })
    ).toThrow(/CELTRONICS_DB_PATH/)
  })
})
