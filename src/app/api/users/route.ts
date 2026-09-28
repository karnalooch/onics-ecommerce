import { NextResponse } from "next/server"
import { z } from "zod"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  nextUserRevision,
  toSafeUserResponse,
  userRevision,
} from "@/lib/userResponse"

export const dynamic = "force-dynamic"

type UserRecord = {
  id: string
  email?: string
  username?: string
  companyName?: string
  roleType?: "ADMIN" | "BIZ" | "RETAIL"
  isApproved?: boolean
  isBlocked?: boolean
  nip?: string | null
  phone?: string
  address?: string
  discount?: number
  tierName?: string
  passwordHash?: string
  updatedAt?: string
  revision?: number | null
  [key: string]: unknown
}

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  companyName: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  username: z.string().trim().max(160).optional(),
  roleType: z.enum(["ADMIN", "BIZ", "RETAIL"]).optional(),
  isApproved: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  nip: z.string().trim().max(20).nullable().optional(),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(250).optional(),
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
})

function isActiveAdmin(user: UserRecord) {
  return user.roleType === "ADMIN" && !user.isBlocked
}

function hasOtherActiveAdmin(users: UserRecord[], excludedIndex: number) {
  return users.some((user, index) => index !== excludedIndex && isActiveAdmin(user))
}

function sameUserField(
  key: string,
  currentValue: unknown,
  requestedValue: unknown
) {
  if (requestedValue === undefined) return true
  if (key === "email") {
    return (
      String(currentValue ?? "").trim().toLowerCase() ===
      String(requestedValue ?? "").trim().toLowerCase()
    )
  }
  if (requestedValue === null) return currentValue == null
  if (typeof requestedValue === "string") {
    return String(currentValue ?? "").trim() === requestedValue
  }
  return currentValue === requestedValue
}

function isUserUpdateReplay(
  current: UserRecord,
  updates: Record<string, unknown>
) {
  return Object.entries(updates).every(([key, value]) =>
    sameUserField(key, current[key], value)
  )
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const { users } = initializeMockData()
  return NextResponse.json(
    (users as UserRecord[]).map((user) =>
      toSafeUserResponse({
        ...user,
        revision: userRevision(user.revision),
      })
    )
  )
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  let body: unknown
  try {
    body = await readCommerceJson(req)
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie administracji kontem jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe body administracji kontem." },
        { status: 400 }
      )
    }
    throw error
  }

  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane." },
      { status: 400 }
    )
  }

  if (parsed.data.expectedRevision === undefined) {
    return NextResponse.json(
      {
        error:
          "Aktualizacja konta wymaga expectedRevision z ostatniego odczytu.",
      },
      { status: 428 }
    )
  }

  try {
    const submission = await mutateMockData((db) => {
      const userStore = db.users as UserRecord[]
      const currentActor = findStoredUserBySession(userStore, authCheck.user)
      if (
        !currentActor ||
        !hasAccountRoleAccess(currentActor, ["ADMIN"])
      ) {
        throw new Error("ADMIN_ACCESS_REVOKED")
      }

      const index = userStore.findIndex((user) => user.id === parsed.data.id)

      if (index === -1) throw new Error("USER_NOT_FOUND")

      const current = userStore[index]
      const currentRevision = userRevision(current.revision)
      const { id: _id, expectedRevision, ...updates } = parsed.data
      void _id

      if (expectedRevision !== currentRevision) {
        if (isUserUpdateReplay(current, updates)) {
          return {
            user: toSafeUserResponse({
              ...current,
              revision: currentRevision,
            }),
            replayed: true,
          }
        }
        throw new Error("USER_REVISION_CONFLICT")
      }

      if (isUserUpdateReplay(current, updates)) {
        return {
          user: toSafeUserResponse({
            ...current,
            revision: currentRevision,
          }),
          replayed: true,
        }
      }

      if (
        updates.email &&
        userStore.some(
          (user, userIndex) =>
            userIndex !== index &&
            user.email?.trim().toLowerCase() === updates.email
        )
      ) {
        throw new Error("EMAIL_EXISTS")
      }

      const nextUser: UserRecord = {
        ...current,
        ...updates,
        revision: nextUserRevision(currentRevision),
        updatedAt: new Date().toISOString(),
      }

      if (
        isActiveAdmin(current) &&
        !isActiveAdmin(nextUser) &&
        !hasOtherActiveAdmin(userStore, index)
      ) {
        throw new Error("LAST_ACTIVE_ADMIN")
      }

      userStore[index] = nextUser
      return {
        user: toSafeUserResponse(nextUser),
        replayed: false,
      }
    })

    return NextResponse.json(submission.user, {
      headers: submission.replayed
        ? { "Idempotency-Replayed": "true" }
        : undefined,
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed zapisem konta." },
        { status: 403 }
      )
    }
    if (code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 })
    }
    if (code === "USER_REVISION_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Konto zmieniło się od ostatniego odczytu. Odśwież dane i ponów zmianę.",
          code: "USER_REVISION_CONFLICT",
        },
        { status: 409 }
      )
    }
    if (code === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "Użytkownik z tym adresem e-mail już istnieje." },
        { status: 409 }
      )
    }
    if (code === "LAST_ACTIVE_ADMIN") {
      return NextResponse.json(
        { error: "Nie można wyłączyć ostatniego aktywnego administratora." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać użytkownika." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const rawExpectedRevision = url.searchParams.get("expectedRevision")
  if (!id) {
    return NextResponse.json({ error: "Brak ID użytkownika." }, { status: 400 })
  }
  if (rawExpectedRevision === null) {
    return NextResponse.json(
      {
        error:
          "Usunięcie konta wymaga expectedRevision z ostatniego odczytu.",
      },
      { status: 428 }
    )
  }

  const parsedRevision = z.coerce
    .number()
    .int()
    .nonnegative()
    .safeParse(rawExpectedRevision)
  if (!parsedRevision.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa wersja konta." },
      { status: 400 }
    )
  }

  try {
    const result = await mutateMockData((db) => {
      const userStore = db.users as UserRecord[]
      const currentActor = findStoredUserBySession(userStore, authCheck.user)
      if (
        !currentActor ||
        !hasAccountRoleAccess(currentActor, ["ADMIN"])
      ) {
        throw new Error("ADMIN_ACCESS_REVOKED")
      }

      const index = userStore.findIndex((user) => user.id === id)

      if (index === -1) return { replayed: true }

      const current = userStore[index]
      if (userRevision(current.revision) !== parsedRevision.data) {
        throw new Error("USER_REVISION_CONFLICT")
      }

      if (isActiveAdmin(current) && !hasOtherActiveAdmin(userStore, index)) {
        throw new Error("LAST_ACTIVE_ADMIN")
      }

      userStore.splice(index, 1)
      return { replayed: false }
    })

    return NextResponse.json(
      { success: true },
      {
        headers: result.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed usunięciem konta." },
        { status: 403 }
      )
    }
    if (code === "USER_REVISION_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Konto zmieniło się od ostatniego odczytu. Odśwież dane przed usunięciem.",
          code: "USER_REVISION_CONFLICT",
        },
        { status: 409 }
      )
    }
    if (code === "LAST_ACTIVE_ADMIN") {
      return NextResponse.json(
        { error: "Nie można usunąć ostatniego aktywnego administratora." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }
}
