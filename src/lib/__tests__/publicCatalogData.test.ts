import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadPublicCatalog } from "@/app/produkty/catalog-data"
const mocks = vi.hoisted(() => ({ read: vi.fn(), project: vi.fn() }))
vi.mock("@/store/serverStore", () => ({ initializeMockData: mocks.read }))
vi.mock("@/lib/productCatalogView", () => ({ buildProductCatalogView: mocks.project }))
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockReturnValue({ products: [], users: [], categories: [] }); mocks.project.mockResolvedValue([]) })
describe("public catalog read truth", () => {
  it("keeps a valid empty catalog distinct from an outage", async () => { expect(await loadPublicCatalog()).toEqual({ status: "ready", products: [] }) })
  it("does not replace a corrupt database with an empty success", async () => {
    mocks.read.mockImplementation(() => { throw new Error("Corrupt data") })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try { const result = await loadPublicCatalog(); expect(result.status).toBe("error"); expect(result).not.toHaveProperty("products"); expect(mocks.project).not.toHaveBeenCalled() } finally { log.mockRestore() }
  })
  it("passes the actual identity to authoritative projection on every read", async () => {
    await loadPublicCatalog({ id: "a", email: "a@example.test" }); await loadPublicCatalog({ id: "b", email: "b@example.test" })
    expect(mocks.project).toHaveBeenNthCalledWith(1, [], [], [], { id: "a", email: "a@example.test" })
    expect(mocks.project).toHaveBeenNthCalledWith(2, [], [], [], { id: "b", email: "b@example.test" })
  })
  it("treats a failed catalog projection as an outage", async () => {
    mocks.project.mockRejectedValue(new Error("Projection failed"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try { expect((await loadPublicCatalog()).status).toBe("error") } finally { log.mockRestore() }
  })
})
