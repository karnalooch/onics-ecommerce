import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

function renderCatalog() {
  return render(<B2BDashboardGrid nip="CI-NIP" email="partner@example.test" ownerKey="id:partner-fixture" />)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  state.addItem.mockReturnValue(true)
  state.cartOwnerReady = true
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("partner catalog failure and retry states", () => {
  it("shows empty results only after a successful empty response", async () => {
    fetchMock.mockResolvedValueOnce(response([]))
    renderCatalog()
    await screen.findByText("Brak produktów")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull()
  })

  it.each([401, 403, 503])("does not disguise HTTP %s as an empty catalog", async (status) => {
    fetchMock.mockResolvedValueOnce(response({ error: "Controlled failure" }, status))
    renderCatalog()
    expect((await screen.findByRole("alert")).textContent).toContain("Nie udało się pobrać katalogu")
    expect(screen.queryByText("Brak produktów")).toBeNull()
    expect(screen.queryByRole("button", { name: "Dodaj" })).toBeNull()
  })

  it.each([null, { items: [] }])("rejects a malformed successful payload: %j", async (payload) => {
    fetchMock.mockResolvedValueOnce(response(payload))
    renderCatalog()
    await screen.findByRole("alert")
    expect(screen.queryByText("Brak produktów")).toBeNull()
  })

  it("does not disguise invalid JSON as an empty catalog", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }))
    renderCatalog()
    await screen.findByRole("alert")
    expect(screen.queryByText("Brak produktów")).toBeNull()
  })

  it("offers retry after a network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"))
    renderCatalog()
    await screen.findByRole("alert")
    expect(screen.getByRole("button", { name: "Spróbuj ponownie" })).toBeDefined()
    expect(screen.queryByText("Brak produktów")).toBeNull()
  })

  it("retries the real catalog endpoint and replaces the error with account prices", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "Unavailable" }, 503))
    fetchMock.mockResolvedValueOnce(response([product]))
    renderCatalog()
    fireEvent.click(await screen.findByRole("button", { name: "Spróbuj ponownie" }))
    await screen.findByText("83,00 zł netto")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe("/api/products")
      expect(options?.cache).toBe("no-store")
    }
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText("Brak produktów")).toBeNull()
  })

  it("announces loading and cancels an unfinished request on unmount", () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined))
    const view = renderCatalog()
    expect(screen.getByRole("status", { name: "Ładowanie katalogu" })).toBeDefined()
    expect(screen.queryByText("Brak produktów")).toBeNull()
    const signal = fetchMock.mock.calls[0]?.[1]?.signal
    expect(signal?.aborted).toBe(false)
    view.unmount()
    expect(signal?.aborted).toBe(true)
  })

  it("preserves the cart owner readiness boundary", async () => {
    state.cartOwnerReady = false
    fetchMock.mockResolvedValueOnce(response([product]))
    renderCatalog()
    const button = await screen.findByRole("button", { name: "Dodaj" })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(state.addItem).not.toHaveBeenCalled()
    expect(state.push).not.toHaveBeenCalled()
  })

  it("preserves account-priced cart data and navigation after loading", async () => {
    fetchMock.mockResolvedValueOnce(response([product]))
    renderCatalog()
    fireEvent.click(await screen.findByRole("button", { name: "Dodaj" }))
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
