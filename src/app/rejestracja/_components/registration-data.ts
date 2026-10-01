import { validateEmail, validateNip } from "@/lib/validation"
import { isPasswordWithinBcryptLimit } from "@/lib/passwordPolicy"

export interface PartnerRegistrationData {
  email: string; password: string; nip: string; companyName: string
  phone: string; address: string; consentVat: boolean; consentReg: boolean
}
export type RegistrationErrors = Partial<Record<keyof PartnerRegistrationData, string>>
export function readRegistrationData(form: HTMLFormElement): PartnerRegistrationData {
  const values = new FormData(form)
  const text = (key: string) => String(values.get(key) ?? "")
  return { email: text("email").trim(), password: text("password"), nip: text("nip").replace(/\D/g, ""), companyName: text("companyName").trim(), phone: text("phone").trim(), address: text("address").trim(), consentVat: values.get("consentVat") === "on", consentReg: values.get("consentReg") === "on" }
}
export function validateRegistrationData(data: PartnerRegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (!validateEmail(data.email)) errors.email = "Podaj prawidłowy adres e-mail."
  if (data.password.length < 8) errors.password = "Hasło musi mieć co najmniej 8 znaków."
  else if (!isPasswordWithinBcryptLimit(data.password)) errors.password = "Hasło jest zbyt długie (maksymalnie 72 bajty UTF-8)."
  if (!validateNip(data.nip)) errors.nip = "Podaj prawidłowy, dziesięciocyfrowy NIP."
  if (data.companyName.length < 2 || data.companyName.length > 160) errors.companyName = "Nazwa firmy powinna mieć od 2 do 160 znaków."
  if (data.phone.length > 50) errors.phone = "Telefon może mieć maksymalnie 50 znaków."
  if (data.address.length > 250) errors.address = "Adres może mieć maksymalnie 250 znaków."
  if (!data.consentReg) errors.consentReg = "Akceptacja regulaminu jest wymagana."
  return errors
}
