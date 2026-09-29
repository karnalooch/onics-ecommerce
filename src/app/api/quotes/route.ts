import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import {
  COMMERCE_TRANSACTION_ROLES,
  isCommerceTransactionRole,
} from "@/lib/commerceAccess"
import { mutateMockData } from "@/store/serverStore"
import { calculateCustomerUnitPrice, roundMoney } from "@/lib/commerce"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { buildQuoteSubmissionFingerprint } from "@/lib/quoteSubmissionIdempotency"
import {
  QuoteBodyInvalidError,
  QuoteBodyTooLargeError,
  readQuoteJson,
} from "@/lib/quoteIngress"
import {
  applicationRateLimiter,
  type RateLimitResult,
} from "@/lib/rateLimit"
import {
  AdminQuoteUpdateSchema,
  assertQuoteAdminExpectedStatus,
  assertQuoteAdminTransition,
  isQuoteAdminUpdateReplay,
  requirePositiveQuoteTotal,
  requireQuoteBasePrice,
} from "@/lib/quoteAdmin"

const QUOTE_SUBMISSION_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
} as const

function quoteRateLimited(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Zbyt wiele zapytań ofertowych. Spróbuj ponownie później." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  )
}

const QuoteSchema = z.object({
  requestId: z.string().uuid(),
  productId: z.string().trim().min(1),
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
  orderType?: string
  clientQuoteRequestId?: string
  clientQuoteRequestFingerprint?: string
  user?: {
    id?: string
    email?: string
    companyName?: string
    nip?: string | null
  }
  productId?: string
  productName?: string
  quantity?: number
  message?: string
  totalPriceFinal?: number
  [key: string]: unknown
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  const accountRateLimitKey = String(
    authCheck.currentUser.id ?? authCheck.currentUser.email ?? "unknown"
  )
  const accountLimit = applicationRateLimiter.check(
    "quote-submit-account",
    accountRateLimitKey,
    QUOTE_SUBMISSION_RATE_LIMIT
  )
  if (!accountLimit.allowed) return quoteRateLimited(accountLimit)

  try {
    const parsed = QuoteSchema.safeParse(await readQuoteJson(req))
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

      if (!isCommerceTransactionRole(storedUser.roleType)) {
        throw new Error("QUOTE_ROLE_NOT_ALLOWED")
      }

      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("BIZ_NOT_APPROVED")
      }

      const requestFingerprint = buildQuoteSubmissionFingerprint({
        productId: parsed.data.productId,
        expectedQuantity: parsed.data.expectedQuantity,
        message: parsed.data.message,
      })
      const existing = orders.find(
        (quote) =>
          quote.clientQuoteRequestId === parsed.data.requestId &&
          quote.user &&
          Boolean(findStoredUserBySession([quote.user], sessionUser))
      )

      if (existing) {
        if (existing.clientQuoteRequestFingerprint !== requestFingerprint) {
          throw new Error("QUOTE_IDEMPOTENCY_KEY_REUSED")
        }
        return { quote: existing, storedUser, replayed: true }
      }

      const product = products.find(
        (entry) => String(entry.id) === parsed.data.productId
      )
      if (!product) throw new Error("PRODUCT_NOT_FOUND")

      const quote = {
        id: `QUOTE-${crypto.randomUUID()}`,
        clientQuoteRequestId: parsed.data.requestId,
        clientQuoteRequestFingerprint: requestFingerprint,
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
      return { quote, storedUser, replayed: false }
    })

    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const adminEmail = process.env.ADMIN_EMAIL

    if (!result.replayed && smtpHost && smtpUser && smtpPass && adminEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          connectionTimeout: 5_000,
          greetingTimeout: 5_000,
          socketTimeout: 10_000,
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
        clientRequestId: parsed.data.requestId,
        message: "Zapytanie zostało zapisane.",
      },
      {
        status: result.replayed ? 200 : 201,
        headers: result.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    if (error instanceof QuoteBodyTooLargeError) {
      return NextResponse.json(
        { error: "Zapytanie ofertowe jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof QuoteBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe body zapytania ofertowego." },
        { status: 400 }
      )
    }

    const code = error instanceof Error ? error.message : ""
    if (code === "ACCOUNT_UNAVAILABLE") {
      return NextResponse.json({ error: "Konto jest niedostępne." }, { status: 403 })
    }
    if (code === "QUOTE_ROLE_NOT_ALLOWED") {
      return NextResponse.json(
        { error: "Konto nie ma uprawnień do składania zapytań ofertowych." },
        { status: 403 }
      )
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
    if (code === "QUOTE_IDEMPOTENCY_KEY_REUSED") {
      return NextResponse.json(
        {
          error:
            "Identyfikator zapytania został już użyty dla innej treści. Zamknij formularz i spróbuj ponownie.",
        },
        { status: 409 }
      )
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
    const parsed = AdminQuoteUpdateSchema.safeParse(await readQuoteJson(req))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowa aktualizacja wyceny." },
        { status: 400 }
      )
    }

    const submission = await mutateMockData((db) => {
      const orders = db.orders as StoredQuote[]
      const products = db.products as StoredProduct[]
      const users = db.users as StoredUser[]
      const currentActor = findStoredUserBySession(users, authCheck.user)
      if (
        !currentActor ||
        !hasAccountRoleAccess(currentActor, ["ADMIN"])
      ) {
        throw new Error("ADMIN_ACCESS_REVOKED")
      }

      const quoteIndex = orders.findIndex(
        (entry) => entry.id === parsed.data.id
      )

      if (quoteIndex === -1) throw new Error("QUOTE_NOT_FOUND")

      const quote = orders[quoteIndex]
      if (quote.orderType !== "INQUIRY") {
        throw new Error("QUOTE_TARGET_INVALID")
      }
      if (isQuoteAdminUpdateReplay(quote, parsed.data)) {
        return { quote, replayed: true }
      }
      assertQuoteAdminExpectedStatus(
        quote.status,
        parsed.data.expectedStatus
      )
      assertQuoteAdminTransition(quote.status)
      let totalPriceFinal = Number(quote.totalPriceFinal || 0)

      if (parsed.data.status === "QUOTED") {
        const customer = quote.user
          ? findStoredUserBySession(users, quote.user)
          : undefined

        if (!quote.productId) {
          throw new Error("QUOTE_PRODUCT_UNAVAILABLE")
        }

        const product = products.find(
          (entry) => String(entry.id) === quote.productId
        )

        if (!product) {
          throw new Error("QUOTE_PRODUCT_UNAVAILABLE")
        }

        const basePrice = requireQuoteBasePrice(product.price)
        const unitPrice = calculateCustomerUnitPrice(
          {
            id: String(product.id),
            sku: String(product.sku || ""),
            name: String(product.name || ""),
            price: basePrice,
            stock: Number(product.stock ?? 0),
          },
          {
            role: customer?.roleType,
            discount: Number(customer?.discount ?? 0),
          }
        )
        const quantity = Math.max(1, Number(quote.quantity || 1))
        totalPriceFinal = requirePositiveQuoteTotal(
          roundMoney(
            unitPrice *
              quantity *
              (1 - parsed.data.additionalDiscount / 100)
          )
        )
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
      return { quote: nextQuote, replayed: false }
    })

    const {
      clientQuoteRequestId: internalQuoteRequestId,
      clientQuoteRequestFingerprint: internalQuoteRequestFingerprint,
      ...publicQuote
    } = submission.quote
    void internalQuoteRequestId
    void internalQuoteRequestFingerprint
    return NextResponse.json(
      publicQuote,
      {
        headers: submission.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    if (error instanceof QuoteBodyTooLargeError) {
      return NextResponse.json(
        { error: "Aktualizacja wyceny jest zbyt duża." },
        { status: 413 }
      )
    }
    if (error instanceof QuoteBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe body aktualizacji wyceny." },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed aktualizacją wyceny." },
        { status: 403 }
      )
    }
    if (
      error instanceof Error &&
      (error.message === "QUOTE_NOT_FOUND" ||
        error.message === "QUOTE_TARGET_INVALID")
    ) {
      return NextResponse.json(
        { error: "Nie znaleziono zapytania." },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_STATUS_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Status zapytania zmienił się od ostatniego odczytu. Odśwież dane i ponów operację.",
          code: "QUOTE_STATUS_CONFLICT",
        },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_NOT_ACTIONABLE") {
      return NextResponse.json(
        { error: "Zapytanie zostało już rozpatrzone." },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_PRODUCT_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Produkt z zapytania nie jest już dostępny w katalogu." },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_PRODUCT_NOT_PRICED") {
      return NextResponse.json(
        { error: "Produkt nie ma aktywnej ceny sprzedaży. Uzupełnij cenę przed wyceną." },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message === "QUOTE_TOTAL_NOT_POSITIVE") {
      return NextResponse.json(
        { error: "Rabat sprowadza wycenę do zera. Ustaw dodatnią cenę końcową." },
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
