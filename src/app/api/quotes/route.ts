import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, saveMockData } from "@/store/serverStore"
import { calculateCustomerUnitPrice, roundMoney } from "@/lib/commerce"

const QuoteSchema = z.object({
  productId: z.string().min(1),
  expectedQuantity: z.coerce.number().int().min(1).max(100000),
  message: z.string().trim().max(3000).optional().default(""),
})

type SessionUser = {
  id?: string
  email?: string | null
  role?: string
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  nip?: string | null
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = QuoteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe zapytanie." },
        { status: 400 }
      )
    }

    const sessionUser = authCheck.user as SessionUser
    const { users, products, orders } = initializeMockData()
    const storedUser = (users as StoredUser[]).find(
      (user) =>
        (sessionUser.id && user.id === sessionUser.id) ||
        (sessionUser.email &&
          user.email?.toLowerCase() === sessionUser.email.toLowerCase())
    )

    if (!storedUser || storedUser.isBlocked) {
      return NextResponse.json({ error: "Konto jest niedostępne." }, { status: 403 })
    }

    if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const product = products.find(
      (entry: { id?: string }) => String(entry.id) === parsed.data.productId
    )

    if (!product) {
      return NextResponse.json({ error: "Produkt nie istnieje." }, { status: 404 })
    }

    const newQuote = {
      id: `QUOTE-${crypto.randomUUID()}`,
      orderType: "INQUIRY",
      status: "INQUIRY",
      createdAt: new Date().toISOString(),
      user: {
        id: storedUser.id,
        email: storedUser.email,
        companyName: storedUser.companyName,
        nip: storedUser.nip ?? null,
      },
      totalPriceOrig: 0,
      totalPriceFinal: 0,
      productName: String(product.name ?? product.sku ?? "Produkt"),
      productId: String(product.id),
      quantity: parsed.data.expectedQuantity,
      message: parsed.data.message,
    }

    orders.unshift(newQuote)

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić zapytania.")
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const adminEmail = process.env.ADMIN_EMAIL

    if (smtpHost && smtpUser && smtpPass && adminEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })

        await transporter.sendMail({
          from: `"Platforma B2B CEL-TRONICS" <${smtpUser}>`,
          to: adminEmail,
          subject: `[B2B] Zapytanie | ${storedUser.companyName || storedUser.email || "Partner"}`,
          text: [
            "Nowe zapytanie B2B",
            `Produkt: ${newQuote.productName} (ID: ${newQuote.productId})`,
            `Ilość: ${newQuote.quantity}`,
            `Firma: ${storedUser.companyName || "-"}`,
            `NIP: ${storedUser.nip || "-"}`,
            `E-mail: ${storedUser.email || "-"}`,
            `Wiadomość: ${newQuote.message || "-"}`,
          ].join("\n"),
        })
      } catch (mailError) {
        console.warn("Zapytanie zapisane, ale wysyłka SMTP nie powiodła się:", mailError)
      }
    }

    return NextResponse.json(
      { success: true, id: newQuote.id, message: "Zapytanie zostało zapisane." },
      { status: 201 }
    )
  } catch (error) {
    console.error("Błąd zapytania ofertowego:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}


const AdminQuoteUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["QUOTED", "REJECTED"]),
  deliveryTimeDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
  additionalDiscount: z.coerce.number().min(0).max(100).default(0),
})

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = AdminQuoteUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowa aktualizacja wyceny." },
        { status: 400 }
      )
    }

    const { orders, products, users } = initializeMockData()
    const quoteIndex = orders.findIndex(
      (entry: { id?: string }) => entry.id === parsed.data.id
    )

    if (quoteIndex === -1) {
      return NextResponse.json({ error: "Nie znaleziono zapytania." }, { status: 404 })
    }

    const quote = orders[quoteIndex] as {
      id: string
      user?: { id?: string; email?: string }
      productId?: string
      quantity?: number
      items?: Array<{ id?: string; quantity?: number; price?: number }>
      [key: string]: unknown
    }

    let totalPriceFinal = Number(quote.totalPriceFinal || 0)

    if (parsed.data.status === "QUOTED") {
      const customer = users.find(
        (user: { id?: string; email?: string }) =>
          (quote.user?.id && user.id === quote.user.id) ||
          (quote.user?.email &&
            user.email?.toLowerCase() === quote.user.email.toLowerCase())
      )

      if (quote.productId) {
        const product = products.find(
          (entry: { id?: string }) => String(entry.id) === quote.productId
        )

        if (product) {
          const unitPrice = calculateCustomerUnitPrice(
            {
              id: String(product.id),
              sku: String(product.sku || ""),
              name: String(product.name || ""),
              price: Number(product.price ?? 0),
              stock: Number(product.stock ?? 0),
            },
            {
              role: customer?.roleType,
              discount: Number(customer?.discount ?? 0),
            }
          )
          const quantity = Math.max(1, Number(quote.quantity || 1))
          totalPriceFinal = roundMoney(
            unitPrice * quantity * (1 - parsed.data.additionalDiscount / 100)
          )
        }
      }
    }

    orders[quoteIndex] = {
      ...quote,
      status: parsed.data.status,
      deliveryTimeDays:
        parsed.data.status === "QUOTED"
          ? parsed.data.deliveryTimeDays ?? null
          : null,
      additionalDiscount:
        parsed.data.status === "QUOTED"
          ? parsed.data.additionalDiscount
          : 0,
      totalPriceFinal,
      quotedAt:
        parsed.data.status === "QUOTED" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    }

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić wyceny.")
    }

    return NextResponse.json(orders[quoteIndex])
  } catch (error) {
    console.error("Quote update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
