import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { B2BDashboardGrid } from "@/components/ui/B2BDashboardGrid"

const state = vi.hoisted(() => ({
  addItem: vi.fn(),
  push: vi.fn(),
  cartOwnerReady: true,
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }))
vi.mock("@/store/cartStore", () => ({
  useCartStore: (selector: (store: { addItem: typeof state.addItem }) => unknown) =>
    selector({ addItem: state.addItem }),
}))
vi.mock("@/lib/useCartOwnerBinding", () => ({
  useCartOwnerBinding: () => ({ cartOwnerReady: state.cartOwnerReady }),
}))
vi.mock("@/components/ui/QuoteRequestModal", () => ({ QuoteRequestModal: () => null }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
let mounted: boolean
const fetchMock = vi.fn<typeof fetch>()
const product = {
  id: "partner-catalog-fixture",
  sku: "CI-PARTNER-001",
  name: "Urządzenie demonstracyjne",
  manufacturer: "CI fixture",
  price: 83,
  stock: 7,
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function renderCatalog() {
  await act(async () => {
    root.render(<B2BDashboardGrid nip="CI-NIP" email="partner@example.test" ownerKey="id:partner-fixture" />)
  })
}

function findButton(label: string) {
  return Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent?.trim() === label)
}

async function clickButton(label: string) {
  const button = findButton(label)
  if (!button) throw new Error(`Missing button: ${label}`)
  await act(async () => { button.click() })
}

function unmount() {
  if (!mounted) return
  act(() => root.unmount())
  mounted = false
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  state.addItem.mockReturnValue(true)
  state.cartOwnerReady = true
  vi.stubGlobal("fetch", fetchMock)
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  mounted = true
})

afterEach(() => {
  unmount()
  host.remove()
  vi.unstubAllGlobals()
})

describe("partner catalog failure and retry states", () => {
  it("shows empty results only after a successful empty response", async () => {
    fetchMock.mockResolvedValueOnce(response([]))
    await renderCatalog()
    expect(host.querySelector("h3")?.textContent).toBe("Brak produktów")
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(findButton("Spróbuj ponownie")).toBeUndefined()
  })

  it.each([401, 403, 503])("does not disguise HTTP %s as an empty catalog", async (status) => {
    fetchMock.mockResolvedValueOnce(response({ error: "Controlled failure" }, status))
    await renderCatalog()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Nie udało się pobrać katalogu")
    expect(host.textContent).not.toContain("Brak produktów")
    expect(findButton("Dodaj")).toBeUndefined()
  })

  it.each([null, { items: [] }])("rejects a malformed successful payload: %j", async (payload) => {
    fetchMock.mockResolvedValueOnce(response(payload))
    await renderCatalog()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(host.textContent).not.toContain("Brak produktów")
  })

  it("does not disguise invalid JSON as an empty catalog", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }))
    await renderCatalog()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(host.textContent).not.toContain("Brak produktów")
  })

  it("offers retry after a network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"))
    await renderCatalog()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(findButton("Spróbuj ponownie")).toBeDefined()
    expect(host.textContent).not.toContain("Brak produktów")
  })

  it("retries the catalog endpoint and replaces the error with account prices", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "Unavailable" }, 503))
    fetchMock.mockResolvedValueOnce(response([product]))
    await renderCatalog()
    await clickButton("Spróbuj ponownie")
    expect(host.querySelector("article")?.textContent).toContain("83,00 zł netto")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe("/api/products")
      expect(options?.cache).toBe("no-store")
    }
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(host.textContent).not.toContain("Brak produktów")
  })

  it("announces loading and cancels an unfinished request on unmount", async () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined))
    await renderCatalog()
    expect(host.querySelector('[role="status"]')?.getAttribute("aria-label")).toBe("Ładowanie katalogu")
    expect(host.textContent).not.toContain("Brak produktów")
    const signal = fetchMock.mock.calls[0]?.[1]?.signal
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  })

  it("preserves the cart owner readiness boundary", async () => {
    state.cartOwnerReady = false
    fetchMock.mockResolvedValueOnce(response([product]))
    await renderCatalog()
    expect(findButton("Dodaj")?.disabled).toBe(true)
    await clickButton("Dodaj")
    expect(state.addItem).not.toHaveBeenCalled()
    expect(state.push).not.toHaveBeenCalled()
  })

  it("preserves account-priced cart data and navigation after loading", async () => {
    fetchMock.mockResolvedValueOnce(response([product]))
    await renderCatalog()
    await clickButton("Dodaj")
    expect(state.addItem).toHaveBeenCalledWith({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity: 1,
    })
    expect(state.push).toHaveBeenCalledWith("/koszyk")
  })
})
