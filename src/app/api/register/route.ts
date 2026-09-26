import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import { validateNip } from "@/lib/validation"
import {
  applicationRateLimiter,
  getClientRateLimitKey,
  type RateLimitResult,
} from "@/lib/rateLimit"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const REGISTER_CLIENT_POLICY = { limit: 5, windowMs: 15 * 60_000 } as const
const REGISTER_EMAIL_POLICY = { limit: 3, windowMs: 60 * 60_000 } as const

function rateLimited(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Zbyt wiele prób rejestracji. Spróbuj ponownie później." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    }
  )
}

const RegistrationSchema = z.object({
  email: z.string().trim().email("Nieprawidłowy adres e-mail").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(72, "Hasło jest zbyt długie"),
  nip: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => validateNip(value), "Nieprawidłowy NIP"),
  companyName: z.string().trim().min(2, "Nazwa firmy jest zbyt krótka").max(160),
  phone: z.string().trim().max(50).optional().default(""),
  address: z.string().trim().max(250).optional().default(""),
  consentVat: z.boolean().optional().default(false),
  consentReg: z.literal(true, {
    error: "Akceptacja regulaminu jest wymagana",
  }),
})

export async function POST(req: Request) {
  try {
    const clientLimit = applicationRateLimiter.check(
      "register:client",
      getClientRateLimitKey(req),
      REGISTER_CLIENT_POLICY
    )
    if (!clientLimit.allowed) return rateLimited(clientLimit)

    const parsed = RegistrationSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane rejestracji." },
        { status: 400 }
      )
    }

    const data = parsed.data
    const emailLimit = applicationRateLimiter.check(
      "register:email",
      data.email,
      REGISTER_EMAIL_POLICY
    )
    if (!emailLimit.allowed) return rateLimited(emailLimit)

    const snapshot = initializeMockData()
    if (
      (snapshot.users as Array<{ email?: string }>).some(
        (user) =>
          String(user.email ?? "").trim().toLowerCase() === data.email
      )
    ) {
      return NextResponse.json(
        { error: "Użytkownik o tym adresie e-mail już istnieje." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const newUser = {
      id: `u_${crypto.randomUUID()}`,
      username: data.email,
      email: data.email,
      passwordHash,
      nip: data.nip,
      companyName: data.companyName,
      phone: data.phone,
      address: data.address,
      consentVat: data.consentVat,
      roleType: "BIZ",
      isApproved: false,
      isBlocked: false,
      createdAt: new Date().toISOString(),
      discount: 0,
      tierName: "BASIC",
    }

    await mutateMockData((db) => {
      const users = db.users as Array<{ email?: string }>
      if (
        users.some(
          (user) =>
            String(user.email ?? "").trim().toLowerCase() === data.email
        )
      ) {
        throw new Error("EMAIL_EXISTS")
      }

      users.push(newUser)
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          companyName: newUser.companyName,
          isApproved: newUser.isApproved,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "Użytkownik o tym adresie e-mail już istnieje." },
        { status: 409 }
      )
    }

    console.error("Błąd rejestracji:", error)
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisu konta." },
      { status: 500 }
    )
  }
}
