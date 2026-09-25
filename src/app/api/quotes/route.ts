import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, saveMockData } from "@/store/serverStore"

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
