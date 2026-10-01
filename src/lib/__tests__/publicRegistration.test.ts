import { describe, expect, it } from "vitest"
import { readRegistrationData, validateRegistrationData, type PartnerRegistrationData } from "@/app/rejestracja/_components/registration-data"
const valid: PartnerRegistrationData = { email: "partner@example.test", password: "password123", nip: "1112223332", companyName: "Test", phone: "", address: "", consentVat: false, consentReg: true }
describe("partner registration presentation validation", () => {
  it("accepts the existing backend fields without requiring optional invoice consent", () => { expect(validateRegistrationData(valid)).toEqual({}) })
  it("enforces eight characters, not a one-point password meter", () => { expect(validateRegistrationData({ ...valid, password: "A" }).password).toBeDefined() })
  it("uses the same UTF-8 bcrypt limit as the server", () => { expect(validateRegistrationData({ ...valid, password: "ą".repeat(37) }).password).toBeDefined(); expect(validateRegistrationData({ ...valid, password: "ą".repeat(36) }).password).toBeUndefined() })
  it("validates NIP checksum and required terms", () => { const errors = validateRegistrationData({ ...valid, nip: "1112223333", consentReg: false }); expect(errors.nip).toBeDefined(); expect(errors.consentReg).toBeDefined() })
  it("matches the two-character company-name minimum", () => { expect(validateRegistrationData({ ...valid, companyName: "AB" })).toEqual({}); expect(validateRegistrationData({ ...valid, companyName: "A" }).companyName).toBeDefined() })
  it("bounds optional contact fields", () => { const errors = validateRegistrationData({ ...valid, phone: "1".repeat(51), address: "a".repeat(251) }); expect(errors.phone).toBeDefined(); expect(errors.address).toBeDefined() })
  it("reads the exact existing registration payload from native controls", () => {
    const form = document.createElement("form")
    for (const [name, value] of Object.entries(valid)) { const input = document.createElement("input"); input.name = name; if (typeof value === "boolean") { input.type = "checkbox"; input.checked = value } else input.value = value; form.append(input) }
    expect(readRegistrationData(form)).toEqual(valid)
  })
})
