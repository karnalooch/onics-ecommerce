import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LoginPage from "@/app/logowanie/page"
import RegisterPage from "@/app/rejestracja/page"

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), fetch: vi.fn() }))
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.clearAllMocks(); mocks.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" })
  vi.stubGlobal("fetch", mocks.fetch)
  host = document.createElement("div"); document.body.append(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })
function render(node: ReactNode) { act(() => root.render(node)) }
function input(name: string) { const field = host.querySelector<HTMLInputElement>(`input[name="${name}"]`); if (!field) throw new Error(`Missing ${name}`); return field }
async function submit() { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })) }) }
function validCompany() {
  input("email").value = "proof@example.invalid"; input("password").value = "Proof-only-123"
  input("nip").value = "111-222-33-32"; input("companyName").value = "Test company"
  input("consentReg").checked = true
}

describe("login behavior", () => {
  it("keeps a stable password label when visibility changes", () => {
    render(<LoginPage />)
    expect(input("password").labels?.[0].textContent).toBe("Hasło")
    const toggle = host.querySelector<HTMLButtonElement>('button[aria-controls="login-password"]')!
    act(() => toggle.click())
    expect(input("password").type).toBe("text")
    expect(input("password").labels?.[0].textContent).toBe("Hasło")
    act(() => toggle.click()); expect(input("password").type).toBe("password")
  })
  it("keeps credential errors generic and does not fetch a success session", async () => {
    render(<LoginPage />); input("email").value = "proof@example.invalid"; input("password").value = "test"
    await submit()
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", { email: "proof@example.invalid", password: "test", redirect: false })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Sprawdź adres e-mail i hasło")
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(input("email").value).toBe("proof@example.invalid")
  })
  it("does not treat an unavailable session response as successful navigation", async () => {
    mocks.signIn.mockResolvedValue({ ok: true }); mocks.fetch.mockResolvedValue({ ok: false })
    render(<LoginPage />); await submit()
    expect(mocks.fetch).toHaveBeenCalledWith("/api/auth/session", { cache: "no-store" })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("chwilowo niedostępne")
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false)
  })
  it("rejects a malformed session instead of choosing a default role", async () => {
    mocks.signIn.mockResolvedValue({ ok: true }); mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ user: {} }) })
    render(<LoginPage />); await submit()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("chwilowo niedostępne")
  })
})

describe("registration behavior", () => {
  it("does not send invalid fields and focuses the first invalid control", async () => {
    render(<RegisterPage />); await submit()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input("email"))
    expect(input("email").getAttribute("aria-invalid")).toBe("true")
  })
  it("preserves the same payload and allows retry without erasing entered data", async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "Spróbuj ponownie później." }) })
      .mockResolvedValueOnce({ ok: true, status: 202, json: async () => ({ success: true }) })
    render(<RegisterPage />); validCompany(); await submit()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Spróbuj ponownie później.")
    expect(input("companyName").value).toBe("Test company")
    const payload = JSON.parse(mocks.fetch.mock.calls[0][1].body as string)
    expect(payload).toEqual({ email: "proof@example.invalid", password: "Proof-only-123", nip: "1112223332", companyName: "Test company", phone: "", address: "", consentVat: false, consentReg: true })
    await submit()
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    expect(host.querySelector("h1")?.textContent).toBe("Zgłoszenie przyjęte do obsługi")
    expect(host.textContent).toContain("nie potwierdza utworzenia nowego konta")
  })
  it("rejects a successful HTTP response without the acknowledgment contract", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({}) })
    render(<RegisterPage />); validCompany(); await submit()
    expect(host.querySelector("form")).not.toBeNull()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
  })
})
