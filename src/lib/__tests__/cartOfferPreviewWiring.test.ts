import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("cart offer response contract wiring", () => {
  it("validates the offer response before it can be rendered or printed", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/oferta/page.tsx"),
      "utf8"
    )

    expect(page).toContain("validateCartOfferPreview")
    expect(page).toContain("const requestedItems = items.map")
    expect(page).toContain("validateCartOfferPreview(requestedItems, data)")
    expect(page).not.toContain("setPreview(data as OfferPreview)")
  })
})
