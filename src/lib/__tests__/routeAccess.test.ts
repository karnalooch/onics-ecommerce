import { describe, expect, it } from "vitest"
import { authorizePageRoute } from "@/lib/routeAccess"

describe("proxy page authorization", () => {
  it("allows public pages without a session", () => {
    expect(authorizePageRoute("/", undefined)).toBe(true)
    expect(authorizePageRoute("/logowanie", undefined)).toBe(true)
    expect(authorizePageRoute("/sklep", undefined)).toBe(true)
    expect(authorizePageRoute("/api/orders", undefined)).toBe(true)
  })

  it("requires ADMIN for admin pages", () => {
    expect(authorizePageRoute("/admin", "ADMIN")).toBe(true)
    expect(authorizePageRoute("/admin/orders", "ADMIN")).toBe(true)
    expect(authorizePageRoute("/admin", "BIZ")).toBe(false)
    expect(authorizePageRoute("/admin/orders", undefined)).toBe(false)
  })

  it("requires BIZ for partner pages", () => {
    for (const pathname of [
      "/dashboard",
      "/oferty",
      "/oferty/zamowienia",
      "/ustawienia",
    ]) {
      expect(authorizePageRoute(pathname, "BIZ")).toBe(true)
      expect(authorizePageRoute(pathname, "ADMIN")).toBe(false)
      expect(authorizePageRoute(pathname, undefined)).toBe(false)
    }
  })

  it("does not overmatch unrelated public paths", () => {
    expect(authorizePageRoute("/administrator", undefined)).toBe(true)
    expect(authorizePageRoute("/oferty-publiczne", undefined)).toBe(true)
  })
})
