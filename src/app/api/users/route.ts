import { NextResponse } from "next/server"
import { z } from "zod"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"
import { toSafeUserResponse } from "@/lib/userResponse"

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
})

function isActiveAdmin(user: UserRecord) {
  return user.roleType === "ADMIN" && !user.isBlocked
}

function hasOtherActiveAdmin(users: UserRecord[], excludedIndex: number) {
  return users.some((user, index) => index !== excludedIndex && isActiveAdmin(user))
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const { users } = initializeMockData()
  return NextResponse.json((users as UserRecord[]).map(toSafeUserResponse))
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = UpdateUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane." },
      { status: 400 }
    )
  }

  try {
    const updated = await mutateMockData((db) => {
      const userStore = db.users as UserRecord[]
      const index = userStore.findIndex((user) => user.id === parsed.data.id)

      if (index === -1) throw new Error("USER_NOT_FOUND")

      if (
        parsed.data.email &&
        userStore.some(
          (user, userIndex) =>
            userIndex !== index &&
            user.email?.trim().toLowerCase() === parsed.data.email
        )
      ) {
        throw new Error("EMAIL_EXISTS")
      }

      const nextUser: UserRecord = {
        ...userStore[index],
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      }

      if (
        isActiveAdmin(userStore[index]) &&
        !isActiveAdmin(nextUser) &&
        !hasOtherActiveAdmin(userStore, index)
      ) {
        throw new Error("LAST_ACTIVE_ADMIN")
      }

      userStore[index] = nextUser
      return toSafeUserResponse(nextUser)
    })

    return NextResponse.json(updated)
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 })
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

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID użytkownika." }, { status: 400 })
  }

  try {
    await mutateMockData((db) => {
      const userStore = db.users as UserRecord[]
      const index = userStore.findIndex((user) => user.id === id)

      if (index === -1) throw new Error("USER_NOT_FOUND")

      if (isActiveAdmin(userStore[index]) && !hasOtherActiveAdmin(userStore, index)) {
        throw new Error("LAST_ACTIVE_ADMIN")
      }

      userStore.splice(index, 1)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 })
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
