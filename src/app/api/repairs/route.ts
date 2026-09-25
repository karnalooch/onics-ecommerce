import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

export const dynamic = "force-dynamic"

const CreateRepairSchema = z.object({
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

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  username?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

function findStoredUser(users: StoredUser[], sessionUser: SessionUser) {
  return users.find(
    (user) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        user.email?.toLowerCase() === sessionUser.email.toLowerCase())
  )
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { repairs } = initializeMockData()

  if (authCheck.currentRole === "ADMIN") {
    return NextResponse.json(repairs)
  }

  return NextResponse.json(
    repairs.filter(
      (repair: { user?: { id?: string; email?: string } }) =>
        (sessionUser.id && repair.user?.id === sessionUser.id) ||
        (sessionUser.email &&
          repair.user?.email?.toLowerCase() === sessionUser.email.toLowerCase())
    )
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = CreateRepairSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe zgłoszenie." },
        { status: 400 }
      )
    }

    const sessionUser = authCheck.user as SessionUser
    const repair = await mutateMockData((db) => {
      const storedUser = findStoredUser(db.users as StoredUser[], sessionUser)

      if (!storedUser || storedUser.isBlocked) {
        throw new Error("ACCOUNT_UNAVAILABLE")
      }

      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("BIZ_NOT_APPROVED")
      }

      const nextRepair = {
        id: `RMA-${crypto.randomUUID()}`,
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
            storedUser.companyName || storedUser.username || sessionUser.name,
        },
      }

      db.repairs.unshift(nextRepair)
      return nextRepair
    })

    return NextResponse.json(repair, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "ACCOUNT_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Konto jest niedostępne." },
        { status: 403 }
      )
    }
    if (code === "BIZ_NOT_APPROVED") {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
