import fs from "node:fs"
import path from "node:path"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppChrome } from "@/components/shell/AppChrome"
import { IconicNav } from "@/components/ui/IconicNav"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { PublicHome } from "@/components/public/PublicHome"

const state = vi.hoisted(() => ({ pathname: "/", status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated", role: "BIZ", signOut: vi.fn() }))
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }))
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: state.status, data: state.status === "authenticated" ? { user: { role: state.role } } : null }), signOut: state.signOut,
}))
beforeEach(() => { state.pathname = "/"; state.status = "unauthenticated"; state.role = "BIZ"; vi.clearAllMocks() })
afterEach(cleanup)
function openMenu() { const toggle = screen.getByRole("button", { name: "Otwórz menu" }); fireEvent.click(toggle); return toggle }

describe("approved CEL-TRONICS presentation", () => {
  it("renders the outlined asset with the correct aspect ratio", () => {
    render(<BrandLogo eager />)
    const image = screen.getByRole("img", { name: "CEL-TRONICS" })
    expect(image.getAttribute("src")).toBe("/assets/logo.svg")
    expect(image.getAttribute("width")).toBe("2045")
    expect(image.getAttribute("height")).toBe("515")
    expect(image.getAttribute("loading")).toBe("eager")
  })
  it("keeps SVG self-contained and free of scripts, raster images and external fonts", () => {
    const svg = fs.readFileSync(path.join(process.cwd(), "public/assets/logo.svg"), "utf8")
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror, image, script, foreignObject, text")).toBeNull()
    expect(document.documentElement.getAttribute("viewBox")).toBe("85 100 2045 515")
    expect(document.querySelectorAll("path").length).toBeGreaterThanOrEqual(2)
    for (const node of document.querySelectorAll("*")) for (const attribute of node.attributes) {
      expect(attribute.name.toLowerCase().startsWith("on")).toBe(false)
      if (attribute.localName === "href") expect(attribute.value.startsWith("#")).toBe(true)
    }
  })
  it("renders services and real navigation targets", () => {
    render(<PublicHome />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("article")).toHaveLength(6)
    expect(screen.getByRole("link", { name: "Omów instalację" }).getAttribute("href")).toBe("/kontakt")
    expect(screen.getByRole("link", { name: "Przejdź do katalogu" }).getAttribute("href")).toBe("/produkty")
    expect(screen.getByRole("link", { name: "serwis@celtronics.pl" }).getAttribute("href")).toBe("mailto:serwis@celtronics.pl")
    expect(document.getElementById("zakres-prac")).not.toBeNull()
  })
  it("opens the mobile disclosure and restores focus on Escape", () => {
    render(<IconicNav />)
    const toggle = openMenu()
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    const menu = within(screen.getByRole("navigation", { name: "Nawigacja mobilna" }))
    menu.getByRole("link", { name: "Usługi" }).focus()
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(toggle)
    expect(document.getElementById("public-menu")?.hidden).toBe(true)
  })
  it("closes the panel on destination selection", () => {
    render(<IconicNav />); openMenu()
    fireEvent.click(within(screen.getByRole("navigation", { name: "Nawigacja mobilna" })).getByRole("link", { name: "Firma" }))
    expect(document.getElementById("public-menu")?.hidden).toBe(true)
  })
  it("closes the panel across a route change", () => {
    const view = render(<IconicNav />); openMenu(); state.pathname = "/kontakt"; view.rerender(<IconicNav />)
    expect(document.getElementById("public-menu")?.hidden).toBe(true)
  })
  it.each(["/produkty", "/produkty/model"])("marks catalog active at %s", (pathname) => {
    state.pathname = pathname; render(<IconicNav />)
    const nav = within(screen.getByRole("navigation", { name: "Główna nawigacja" }))
    expect(nav.getByRole("link", { name: "Katalog" }).getAttribute("aria-current")).toBe("page")
    expect(nav.getByRole("link", { name: "Firma" }).hasAttribute("aria-current")).toBe(false)
  })
  it("does not mark unrelated route prefixes active", () => {
    state.pathname = "/produkty-inne"; render(<IconicNav />)
    expect(within(screen.getByRole("navigation", { name: "Główna nawigacja" })).getByRole("link", { name: "Katalog" }).hasAttribute("aria-current")).toBe(false)
  })
  it.each([
    ["unauthenticated", "BIZ", "Strefa partnera", "/logowanie"],
    ["authenticated", "BIZ", "Strefa partnera", "/dashboard"],
    ["authenticated", "ADMIN", "Panel operacyjny", "/admin"],
  ] as const)("preserves %s/%s account navigation", (status, role, label, href) => {
    state.status = status; state.role = role; render(<IconicNav />)
    expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(href)
  })
  it("does not pretend loading is logged-out", () => {
    state.status = "loading"; render(<IconicNav />)
    expect(screen.getByRole("status").textContent).toBe("Wczytywanie konta…")
    expect(screen.queryByRole("link", { name: "Strefa partnera" })).toBeNull()
  })
  it("preserves sign-out", () => {
    state.status = "authenticated"; render(<IconicNav />)
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }))
    expect(state.signOut).toHaveBeenCalledWith({ callbackUrl: "/" })
  })
  it.each(["/admin", "/field", "/dashboard", "/oferty", "/ustawienia"])("keeps public chrome outside %s", (pathname) => {
    state.pathname = pathname; render(<AppChrome><p>Treść robocza</p></AppChrome>)
    expect(screen.queryByRole("banner")).toBeNull()
    expect(screen.queryByRole("contentinfo")).toBeNull()
    expect(screen.getByText("Treść robocza")).not.toBeNull()
  })
  it("provides one main landmark and a focusable skip target", () => {
    render(<AppChrome><PublicHome /></AppChrome>)
    const main = screen.getByRole("main")
    expect(main.id).toBe("public-content")
    expect(main.getAttribute("tabindex")).toBe("-1")
    expect(screen.getByRole("link", { name: "Przejdź do treści" }).getAttribute("href")).toBe(`#${main.id}`)
    expect(screen.getByRole("contentinfo")).not.toBeNull()
  })
})
