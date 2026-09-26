import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { mutateMockData } from "@/store/serverStore"
import { calculateCustomerUnitPrice, roundMoney } from "@/lib/commerce"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  AdminQuoteUpdateSchema,
  assertQuoteAdminTransition,
} from "@/lib/quoteAdmin"

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
  discount?: number
}

type StoredProduct = {
  id?: string
  sku?: string
  name?: string
  price?: number | null
  stock?: number | null
}

type StoredQuote = {
  id?: string
  user?: { id?: string; email?: string }
  productId?: string
  quantity?: number
  totalPriceFinal?: number
  [key: string]: unknown
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
    const result = await mutateMockData((db) => {
      const users = db.users as StoredUser[]
      const products = db.products as StoredProduct[]
      const orders = db.orders as StoredQuote[]
      const storedUser = findStoredUserBySession(users, sessionUser)

      if (!storedUser || storedUser.isBlocked) {
        throw new Error("ACCOUNT_UNAVAILABLE")
      }

      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("BIZ_NOT_APPROVED")
      }

      const product = products.find(
        (entry) => String(entry.id) === parsed.data.productId
      )
      if (!product) throw new Error("PRODUCT_NOT_FOUND")

      const quote = {
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

      orders.unshift(quote)
      return { quote, storedUser }
    })

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
          subject: `[B2B] Zapytanie | ${result.storedUser.companyName || result.storedUser.email || "Partner"}`,
          text: [
            "Nowe zapytanie B2B",
            `Produkt: ${result.quote.productName} (ID: ${result.quote.productId})`,
            `Ilość: ${result.quote.quantity}`,
            `Firma: ${result.storedUser.companyName || "-"}`,
            `NIP: ${result.storedUser.nip || "-"}`,
            `E-mail: ${result.storedUser.email || "-"}`,
            `Wiadomość: ${result.quote.message || "-"}`,
          ].join("\n"),
        })
      } catch (mailError) {
        console.warn(
          "Zapytanie zapisane, ale wysyłka SMTP nie powiodła się:",
          mailError
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: result.quote.id,
        message: "Zapytanie zostało zapisane.",
      },
      { status: 201 }
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "ACCOUNT_UNAVAILABLE") {
      return NextResponse.json({ error: "Konto jest niedostępne." }, { status: 403 })
    }
    if (code === "BIZ_NOT_APPROVED") {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }
    if (code === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produkt nie istnieje." }, { status: 404 })
    }

    console.error("Błąd zapytania ofertowego:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}

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

    const updated = await mutateMockData((db) => {
      const orders = db.orders as StoredQuote[]
      const products = db.products as StoredProduct[]
      const users = db.users as StoredUser[]
      const quoteIndex = orders.findIndex(
        (entry) => entry.id === parsed.data.id
      )

      if (quoteIndex === -1) throw new Error("QUOTE_NOT_FOUND")

      const quote = orders[quoteIndex]
      assertQuoteAdminTransition(quote.status)
      let totalPriceFinal = Number(quote.totalPriceFinal || 0)

      if (parsed.data.status === "QUOTED") {
        const customer = quote.user
          ? findStoredUserBySession(users, quote.user)
          : undefined

        if (quote.productId) {
          const product = products.find(
            (entry) => String(entry.id) === quote.productId
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
              unitPrice *
                quantity *
                (1 - parsed.data.additionalDiscount / 100)
            )
          }
        }
      }

      const nextQuote: StoredQuote = {
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

      orders[quoteIndex] = nextQuote
      return nextQuote
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zapytania." },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_NOT_ACTIONABLE") {
      return NextResponse.json(
        { error: "Zapytanie zostało już rozpatrzone." },
        { status: 409 }
      )
    }

    console.error("Quote update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
