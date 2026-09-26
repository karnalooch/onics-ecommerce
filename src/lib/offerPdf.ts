import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type OfferPdfItem = {
  sku: string
  name: string
  quantity: number
  price: number
}

export type OfferPdfCustomer = {
  companyName?: string | null
  email?: string | null
  nip?: string | null
}

export type OfferPdfInput = {
  offerId: string
  createdAt: string
  customer: OfferPdfCustomer
  items: OfferPdfItem[]
  total: number
}

const POLISH_ASCII: Record<string, string> = {
  "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
  "ó": "o", "ś": "s", "ź": "z", "ż": "z",
  "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N",
  "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z",
}

export function normalizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (char) => POLISH_ASCII[char] ?? char)
    .replace(/[^\x20-\x7E]/g, "?")
}

function money(value: number) {
  return `${value.toFixed(2)} PLN`
}

function fitText(value: string, maxChars: number) {
  const normalized = normalizePdfText(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`
}

export async function createOfferPdf(input: OfferPdfInput) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 44
  const rowHeight = 24
  const tableHeaderHeight = 26

  let page = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const drawHeader = () => {
    page.drawText("CEL-TRONICS", {
      x: margin,
      y,
      size: 18,
      font: bold,
    })
    page.drawText("OFERTA B2B", {
      x: pageWidth - margin - 100,
      y: y + 2,
      size: 12,
      font: bold,
    })
    y -= 32

    page.drawText(`Oferta: ${normalizePdfText(input.offerId)}`, {
      x: margin,
      y,
      size: 10,
      font,
    })
    page.drawText(
      `Data: ${normalizePdfText(new Date(input.createdAt).toLocaleDateString("pl-PL"))}`,
      { x: pageWidth - margin - 145, y, size: 10, font }
    )
    y -= 24

    const company = input.customer.companyName || "Partner B2B"
    page.drawText(`Klient: ${fitText(company, 58)}`, {
      x: margin,
      y,
      size: 10,
      font: bold,
    })
    y -= 16

    if (input.customer.nip) {
      page.drawText(`NIP: ${normalizePdfText(input.customer.nip)}`, {
        x: margin,
        y,
        size: 9,
        font,
      })
      y -= 14
    }

    if (input.customer.email) {
      page.drawText(`E-mail: ${fitText(input.customer.email, 70)}`, {
        x: margin,
        y,
        size: 9,
        font,
      })
      y -= 14
    }

    y -= 12
  }

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: pageWidth - 2 * margin,
      height: tableHeaderHeight,
      color: rgb(0.94, 0.94, 0.94),
    })
    page.drawText("SKU / PRODUKT", { x: margin + 6, y: y + 3, size: 8, font: bold })
    page.drawText("IL.", { x: 356, y: y + 3, size: 8, font: bold })
    page.drawText("CENA", { x: 397, y: y + 3, size: 8, font: bold })
    page.drawText("WARTOSC", { x: 477, y: y + 3, size: 8, font: bold })
    y -= tableHeaderHeight
  }

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
    page.drawText("CEL-TRONICS - OFERTA B2B (cd.)", {
      x: margin,
      y,
      size: 11,
      font: bold,
    })
    y -= 30
    drawTableHeader()
  }

  drawHeader()
  drawTableHeader()

  for (const item of input.items) {
    if (y < 110) newPage()

    const label = `${normalizePdfText(item.sku)} - ${fitText(item.name, 42)}`
    page.drawText(label, { x: margin + 6, y: y + 5, size: 8, font })
    page.drawText(String(item.quantity), { x: 358, y: y + 5, size: 8, font })
    page.drawText(money(item.price), { x: 397, y: y + 5, size: 8, font })
    page.drawText(money(item.price * item.quantity), {
      x: 477,
      y: y + 5,
      size: 8,
      font,
    })
    page.drawLine({
      start: { x: margin, y: y - 3 },
      end: { x: pageWidth - margin, y: y - 3 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    })
    y -= rowHeight
  }

  if (y < 110) newPage()
  y -= 10
  page.drawText("SUMA NETTO:", {
    x: 390,
    y,
    size: 11,
    font: bold,
  })
  page.drawText(money(input.total), {
    x: 477,
    y,
    size: 11,
    font: bold,
  })
  y -= 28

  page.drawText(
    "Dokument ma charakter oferty handlowej. Ceny podano bez VAT.",
    { x: margin, y, size: 8, font }
  )
  y -= 14
  page.drawText(
    "Dostepnosc i termin realizacji wymagaja potwierdzenia przez CEL-TRONICS.",
    { x: margin, y, size: 8, font }
  )

  return pdf.save()
}
