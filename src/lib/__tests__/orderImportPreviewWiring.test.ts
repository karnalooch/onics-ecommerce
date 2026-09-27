import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("order import preview response contract wiring", () => {
  it("parses the selected XML and validates the response before rendering it", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("parseCeltronicsOrderXml(xml)")
    expect(page).toContain("validateOrderImportPreview(parsedImport, data)")
    expect(page).toContain("setImportPreview(validatedPreview)")
    expect(page).not.toContain("setImportPreview(data as OrderImportPreview)")
  })
})
