import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import RmaInstallerPage from "@/app/(b2b)/oferty/naprawy/page"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
let mounted: boolean
const fetchMock = vi.fn<typeof fetch>()
const postMock = vi.fn<(options: RequestInit) => Promise<Response>>()
type Submission = { requestId: string; item: string; serial: string; description: string }
const fields = { item: "MODEL-CI", serial: "SERIAL-CI", description: "Opis usterki testowej" }

function receipt(body: Submission, overrides: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    id: `RMA-${body.requestId}`,
    item: body.item,
    serial: body.serial,
    description: body.description,
    clientRequestId: body.requestId,
    date: "2026-10-01",
    status: "WERYFIKACJA",
    ...overrides,
  }), { status: 201, headers: { "Content-Type": "application/json" } })
}

function submitted(index: number): Submission {
  return JSON.parse(String(postMock.mock.calls[index][0].body)) as Submission
}

function control(name: string) {
  const node = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
  if (!node) throw new Error(`Missing control: ${name}`)
  return node
}

async function click(label: string) {
  const button = Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .find((node) => node.textContent?.trim() === label)
  if (!button) throw new Error(`Missing button: ${label}`)
  await act(async () => { button.click() })
}

function fill(values = fields) {
  act(() => {
    for (const [name, value] of Object.entries(values)) {
      const node = control(name)
      const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
      if (!setter) throw new Error("Missing native value setter")
      setter.call(node, value)
      node.dispatchEvent(new Event("input", { bubbles: true }))
    }
  })
}

async function submit() {
  const form = host.querySelector("form")
  if (!form) throw new Error("Missing repair form")
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}

async function openForm() {
  await act(async () => { root.render(<RmaInstallerPage />) })
  // Drain the component's existing deferred initial GET inside React's test boundary.
  await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)) })
  await click("Nowe zgłoszenie")
  fill()
}

function unmount() {
  if (!mounted) return
  act(() => root.unmount())
  mounted = false
}

beforeEach(() => {
  fetchMock.mockReset()
  postMock.mockReset()
  let sequence = 0
  vi.stubGlobal("crypto", {
    randomUUID: () => `11111111-1111-4111-8111-${String(++sequence).padStart(12, "0")}`,
  })
  postMock.mockImplementation(async (options) => receipt(JSON.parse(String(options.body)) as Submission))
  fetchMock.mockImplementation(async (url, options) => {
    if (url !== "/api/repairs") throw new Error(`Unexpected URL: ${String(url)}`)
    if (options?.method === "POST") return postMock(options)
    return new Response("[]", { status: 200 })
  })
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

describe("partner repair submission contract", () => {
  it("sends a UUID with normalized fields and closes only after its matching receipt", async () => {
    await openForm()
    fill({ item: " MODEL-CI ", serial: " SERIAL-CI ", description: " Opis usterki testowej " })
    await submit()
    const body = submitted(0)
    expect(body).toEqual({ ...fields, requestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) })
    expect(host.querySelector("form")).toBeNull()
    expect(host.querySelector("section")?.textContent).toContain(`RMA-${body.requestId}`)
  })

  it("retains the same request and entered data after a lost network response", async () => {
    postMock.mockRejectedValueOnce(new TypeError("Network response lost"))
    await openForm()
    await submit()
    expect(control("item").value).toBe(fields.item)
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    await submit()
    expect(postMock).toHaveBeenCalledTimes(2)
    expect(submitted(1)).toEqual(submitted(0))
    expect(host.querySelector("form")).toBeNull()
  })

  it("retains the replay key after an HTTP failure", async () => {
    postMock.mockResolvedValueOnce(new Response('{"error":"Unavailable"}', { status: 503 }))
    await openForm()
    await submit()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Unavailable")
    await submit()
    expect(submitted(1).requestId).toBe(submitted(0).requestId)
  })

  it.each([
    { clientRequestId: undefined },
    { clientRequestId: "wrong-request" },
    { id: 123 },
  ])("does not clear the form or change the key after malformed acknowledgment %j", async (overrides) => {
    postMock.mockImplementationOnce(async (options) => receipt(JSON.parse(String(options.body)) as Submission, overrides))
    await openForm()
    await submit()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(control("description").value).toBe(fields.description)
    expect(host.querySelector("section")?.textContent).not.toContain("RMA-")
    await submit()
    expect(submitted(1).requestId).toBe(submitted(0).requestId)
    expect(host.querySelector("form")).toBeNull()
  })

  it("uses a new key when the corrected submission payload changes", async () => {
    postMock.mockRejectedValueOnce(new TypeError("Network response lost"))
    await openForm()
    await submit()
    fill({ ...fields, serial: "CORRECTED-SERIAL" })
    await submit()
    expect(submitted(1).requestId).not.toBe(submitted(0).requestId)
    expect(submitted(1).serial).toBe("CORRECTED-SERIAL")
  })

  it("uses a fresh key for a new submission after a confirmed success", async () => {
    await openForm()
    await submit()
    await click("Nowe zgłoszenie")
    fill()
    await submit()
    expect(submitted(1).requestId).not.toBe(submitted(0).requestId)
  })

  it("blocks duplicate submit events and edits while a response is pending", async () => {
    let finish!: (response: Response) => void
    postMock.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve }))
    await openForm()
    await submit()
    await submit()
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(control("item").disabled).toBe(true)
    expect(control("description").disabled).toBe(true)
    await act(async () => { finish(receipt(submitted(0))) })
    expect(host.querySelector("form")).toBeNull()
  })

  it("aborts the client request on unmount and ignores a late acknowledgment", async () => {
    let finish!: (response: Response) => void
    postMock.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve }))
    await openForm()
    await submit()
    const signal = postMock.mock.calls[0][0].signal
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => { finish(receipt(submitted(0))) })
    expect(host.childElementCount).toBe(0)
  })
})
