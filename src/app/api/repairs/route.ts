import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  COMMERCE_TRANSACTION_ROLES,
  isCommerceTransactionRole,
} from "@/lib/commerceAccess"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { buildRepairSubmissionFingerprint } from "@/lib/repairSubmissionIdempotency"
import {
  RepairBodyInvalidError,
  RepairBodyTooLargeError,
  readRepairJson,
} from "@/lib/repairIngress"
import {
  applicationRateLimiter,
  type RateLimitResult,
} from "@/lib/rateLimit"

export const dynamic = "force-dynamic"

const REPAIR_SUBMISSION_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
} as const

function repairRateLimited(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Zbyt wiele zgłoszeń serwisowych. Spróbuj ponownie później." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  )
}

const CreateRepairSchema = z.object({
  requestId: z.string().uuid(),
  item: z.string().trim().min(2).max(200),
  serial: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(3000),
})

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
}

type StoredRepair = {
  id?: string
  clientRepairRequestId?: string
  clientRepairRequestFingerprint?: string
  repairSubmissionChannel?: "ACCOUNT_API" | "ADMIN_ACTION" | string
  user?: {
    id?: string
    email?: string
    companyName?: string
  }
  [key: string]: unknown
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  username?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

function publicRepair(repair: StoredRepair) {
  const {
    clientRepairRequestId: internalRequestId,
    clientRepairRequestFingerprint: internalRequestFingerprint,
    repairSubmissionChannel: internalSubmissionChannel,
    ...publicRecord
  } = repair
  void internalRequestId
  void internalRequestFingerprint
  void internalSubmissionChannel
  return publicRecord
}

export async function GET() {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { repairs } = initializeMockData()

  const repairStore = repairs as StoredRepair[]

  if (authCheck.currentRole === "ADMIN") {
    return NextResponse.json(repairStore.map(publicRepair))
  }

  return NextResponse.json(
    repairStore
      .filter((repair) =>
        repair.user
          ? Boolean(findStoredUserBySession([repair.user], sessionUser))
          : false
      )
      .map(publicRepair)
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  const accountRateLimitKey = String(
    authCheck.currentUser.id ?? authCheck.currentUser.email ?? "unknown"
  )
  const accountLimit = applicationRateLimiter.check(
    "repair-submit-account",
    accountRateLimitKey,
    REPAIR_SUBMISSION_RATE_LIMIT
  )
  if (!accountLimit.allowed) return repairRateLimited(accountLimit)

  try {
    const parsed = CreateRepairSchema.safeParse(await readRepairJson(req))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe zgłoszenie." },
        { status: 400 }
      )
    }

    const sessionUser = authCheck.user as SessionUser
    const submission = await mutateMockData((db) => {
      const storedUser = findStoredUserBySession(
        db.users as StoredUser[],
        sessionUser
      )

      if (!storedUser || storedUser.isBlocked) {
        throw new Error("ACCOUNT_UNAVAILABLE")
      }

      if (!isCommerceTransactionRole(storedUser.roleType)) {
        throw new Error("REPAIR_ROLE_NOT_ALLOWED")
      }

      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("BIZ_NOT_APPROVED")
      }

      const repairs = db.repairs as StoredRepair[]
      const requestFingerprint = buildRepairSubmissionFingerprint({
        item: parsed.data.item,
        serial: parsed.data.serial,
        description: parsed.data.description,
      })
      const existing = repairs.find(
        (repair) =>
          repair.repairSubmissionChannel === "ACCOUNT_API" &&
          repair.clientRepairRequestId === parsed.data.requestId &&
          repair.user &&
          Boolean(findStoredUserBySession([repair.user], sessionUser))
      )

      if (existing) {
        if (
          existing.clientRepairRequestFingerprint !== requestFingerprint
        ) {
          throw new Error("REPAIR_IDEMPOTENCY_KEY_REUSED")
        }
        return { repair: existing, replayed: true }
      }

      const nextRepair: StoredRepair = {
        id: `RMA-${crypto.randomUUID()}`,
        clientRepairRequestId: parsed.data.requestId,
        clientRepairRequestFingerprint: requestFingerprint,
        repairSubmissionChannel: "ACCOUNT_API",
        item: parsed.data.item,
        serial: parsed.data.serial,
        description: parsed.data.description,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        status: "WERYFIKACJA",
        user: {
          id: storedUser.id,
          email: storedUser.email,
          companyName:
            storedUser.companyName ||
            storedUser.username ||
            sessionUser.name ||
            undefined,
        },
      }

      repairs.unshift(nextRepair)
      return { repair: nextRepair, replayed: false }
    })

    return NextResponse.json(
      {
        ...publicRepair(submission.repair),
        clientRequestId: parsed.data.requestId,
      },
      {
        status: submission.replayed ? 200 : 201,
        headers: submission.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    if (error instanceof RepairBodyTooLargeError) {
      return NextResponse.json(
        { error: "Zgłoszenie serwisowe jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof RepairBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe body zgłoszenia serwisowego." },
        { status: 400 }
      )
    }

    const code = error instanceof Error ? error.message : ""
    if (code === "ACCOUNT_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Konto jest niedostępne." },
        { status: 403 }
      )
    }
    if (code === "REPAIR_ROLE_NOT_ALLOWED") {
      return NextResponse.json(
        { error: "Konto nie ma uprawnień do składania zgłoszeń serwisowych." },
        { status: 403 }
      )
    }
    if (code === "BIZ_NOT_APPROVED") {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }
    if (code === "REPAIR_IDEMPOTENCY_KEY_REUSED") {
      return NextResponse.json(
        {
          error:
            "Identyfikator zgłoszenia został już użyty dla innej treści. Odśwież formularz i spróbuj ponownie.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
