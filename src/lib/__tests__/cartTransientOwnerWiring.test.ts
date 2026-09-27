import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("cart owner-scoped transient state wiring", () => {
  it("clears account-scoped transient state when the owner changes", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("const transientOwnerRef = useRef<string | null | undefined>(undefined)")
    expect(page).toContain("ownerGenerationRef.current += 1")
    expect(page).toContain("setImportPreview(null)")
    expect(page).toContain("setManualPaymentConfirmation(null)")
    expect(page).toContain("setImporting(false)")
    expect(page).toContain("setSubmitting(null)")
  })

  it("drops stale async results from the previous cart owner", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("const captureCartOwnerScope = () => ({")
    expect(page).toContain("const isCartOwnerScopeCurrent = (scope:")
    expect(page).toContain("if (!isCartOwnerScopeCurrent(ownerScope)) return;")
    expect(page).toContain("handleOrderImportFile")
    expect(page).toContain("handlePaymentCheckout")
    expect(page).toContain('handleAction = async (action: "PDF" | "INQUIRY" | "ORDER")')
  })
})
