import fs from "node:fs"
import path from "node:path"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppChrome } from "@/components/shell/AppChrome"
import { IconicNav } from "@/components/ui/IconicNav"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { PublicHome } from "@/components/public/PublicHome"

const state = vi.hoisted(() => ({ pathname: "/", status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated", role: "BIZ", signOut: vi.fn() }))
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }))
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: state.status, data: state.status === "authenticated" ? { user: { role: state.role } } : null }), signOut: state.signOut }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
beforeEach(() => { state.pathname = "/"; state.status = "unauthenticated"; state.role = "BIZ"; vi.clearAllMocks(); host = document.createElement("div"); document.body.append(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
function render(node: ReactNode) { act(() => root.render(node)) }
function element<T extends HTMLElement>(selector: string): T { const node = host.querySelector<T>(selector); if (!node) throw new Error(`Missing ${selector}`); return node }
function click(node: HTMLElement) { act(() => node.click()) }
function menuToggle() { return element<HTMLButtonElement>('button[aria-controls="public-menu"]') }

describe("approved CEL-TRONICS presentation", () => {
  it("renders the vector at its intrinsic aspect ratio", () => {
    render(<BrandLogo eager />)
    const image = element<HTMLImageElement>("img")
    expect(image.getAttribute("src")).toBe("/assets/logo.svg")
    expect(image.alt).toBe("CEL-TRONICS")
    expect(image.getAttribute("width")).toBe("2045")
    expect(image.getAttribute("height")).toBe("515")
  })
  it("contains real SVG paths without active content or embedded raster", () => {
    const svg = fs.readFileSync(path.join(process.cwd(), "public/assets/logo.svg"), "utf8")
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(parsed.querySelector("parsererror, image, script, foreignObject, text")).toBeNull()
    expect(parsed.documentElement.getAttribute("viewBox")).toBe("85 100 2045 515")
    expect(parsed.querySelectorAll("path").length).toBeGreaterThanOrEqual(2)
    for (const node of Array.from(parsed.querySelectorAll("*"))) for (const attribute of Array.from(node.attributes)) {
      expect(attribute.name.toLowerCase().startsWith("on")).toBe(false)
      if (attribute.localName === "href") expect(attribute.value.startsWith("#")).toBe(true)
    }
  })
  it("renders service tasks, one heading and real contact destinations", () => {
    render(<PublicHome />)
    expect(host.querySelectorAll("h1")).toHaveLength(1)
    expect(host.querySelectorAll("article")).toHaveLength(6)
    expect(element<HTMLAnchorElement>('a[href="/kontakt"]').textContent).toContain("Omów instalację")
    expect(element<HTMLAnchorElement>('a[href="mailto:serwis@celtronics.pl"]')).not.toBeNull()
    expect(element<HTMLElement>("#zakres-prac")).not.toBeNull()
  })
  it("opens and closes the disclosure with keyboard focus restored", () => {
    render(<IconicNav />); click(menuToggle())
    expect(menuToggle().getAttribute("aria-expanded")).toBe("true")
    const link = element<HTMLAnchorElement>('#public-menu a[href="/uslugi"]'); link.focus()
    act(() => { link.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    expect(element<HTMLElement>("#public-menu").hidden).toBe(true)
    expect(document.activeElement).toBe(menuToggle())
  })
  it("closes the disclosure after selecting a destination", () => {
    render(<IconicNav />); click(menuToggle()); click(element<HTMLAnchorElement>('#public-menu a[href="/"]'))
    expect(element<HTMLElement>("#public-menu").hidden).toBe(true)
  })
  it("does not retain an open menu across route changes", () => {
    render(<IconicNav />); click(menuToggle()); state.pathname = "/kontakt"; render(<IconicNav />)
    expect(element<HTMLElement>("#public-menu").hidden).toBe(true)
  })
  it.each(["/produkty", "/produkty/model"])("marks the actual catalog route active at %s", (pathname) => {
    state.pathname = pathname; render(<IconicNav />)
    expect(element<HTMLAnchorElement>('nav[aria-label="Główna nawigacja"] a[href="/produkty"]').getAttribute("aria-current")).toBe("page")
    expect(element<HTMLAnchorElement>('nav[aria-label="Główna nawigacja"] a[href="/"]').hasAttribute("aria-current")).toBe(false)
  })
  it("does not match unrelated prefixes", () => {
    state.pathname = "/produkty-inne"; render(<IconicNav />)
    expect(element<HTMLAnchorElement>('nav a[href="/produkty"]').hasAttribute("aria-current")).toBe(false)
  })
  it.each([["unauthenticated", "BIZ", "/logowanie"], ["authenticated", "BIZ", "/dashboard"], ["authenticated", "ADMIN", "/admin"]] as const)("preserves %s/%s navigation", (status, role, href) => {
    state.status = status; state.role = role; render(<IconicNav />)
    expect(host.querySelector(`a[href="${href}"]`)).not.toBeNull()
  })
  it("does not call a loading account logged-out", () => {
    state.status = "loading"; render(<IconicNav />)
    expect(element<HTMLElement>('[role="status"]').textContent).toBe("Wczytywanie konta…")
    expect(host.querySelector('a[href="/logowanie"]')).toBeNull()
  })
  it("preserves sign-out behavior", () => {
    state.status = "authenticated"; render(<IconicNav />)
    const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === "Wyloguj")
    expect(button).toBeDefined(); click(button!)
    expect(state.signOut).toHaveBeenCalledWith({ callbackUrl: "/" })
  })
  it.each(["/admin", "/field", "/dashboard", "/oferty", "/ustawienia"])("does not add public chrome inside %s", (pathname) => {
    state.pathname = pathname; render(<AppChrome><p>Treść robocza</p></AppChrome>)
    expect(host.querySelector("header, footer")).toBeNull(); expect(host.textContent).toBe("Treść robocza")
  })
  it("has one main landmark with a working skip target", () => {
    render(<AppChrome><PublicHome /></AppChrome>)
    expect(host.querySelectorAll("main")).toHaveLength(1)
    expect(element<HTMLElement>("main").id).toBe("public-content")
    expect(element<HTMLElement>("main").tabIndex).toBe(-1)
    expect(element<HTMLAnchorElement>('a[href="#public-content"]')).not.toBeNull()
  })
})
