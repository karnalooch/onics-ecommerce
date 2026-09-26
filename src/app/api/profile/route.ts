import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

type SessionUser = { id?: string; email?: string | null; role?: string }
type ProfileUser = {
  id?: string
  email?: string
  companyName?: string
  nip?: string | null
  phone?: string
  address?: string
  discount?: number
  tierName?: string
  isApproved?: boolean
  isBlocked?: boolean
}

const UpdateProfileSchema = z.object({
  phone: z.string().trim().max(50).optional().default(""),
  address: z.string().trim().max(250).optional().default(""),
})

export async function GET() {
  const authCheck = await authorizeAPI(["BIZ", "ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { users } = initializeMockData()
  const user = findStoredUserBySession(users as ProfileUser[], sessionUser)

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono profilu." }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    companyName: user.companyName,
    nip: user.nip,
    phone: user.phone || "",
    address: user.address || "",
    discount: Number(user.discount || 0),
    tierName: user.tierName || "BASIC",
    isApproved: Boolean(user.isApproved),
  })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = UpdateProfileSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane." },
      { status: 400 }
    )
  }

  try {
    const sessionUser = authCheck.user as SessionUser
    const result = await mutateMockData((db) => {
      const user = findStoredUserBySession(db.users as ProfileUser[], sessionUser)
      if (!user) throw new Error("PROFILE_NOT_FOUND")
      if (user.isBlocked) throw new Error("ACCOUNT_BLOCKED")

      user.phone = parsed.data.phone
      user.address = parsed.data.address

      return {
        success: true,
        phone: user.phone,
        address: user.address,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "PROFILE_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono profilu." }, { status: 404 })
    }
    if (code === "ACCOUNT_BLOCKED") {
      return NextResponse.json({ error: "Konto jest zablokowane." }, { status: 403 })
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać profilu." },
      { status: 500 }
    )
  }
}
