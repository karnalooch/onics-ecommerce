import { NextResponse } from "next/server"
import { z } from "zod"
import { initializeMockData, saveMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"

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

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const { users } = initializeMockData()
  const safeUsers = (users as UserRecord[]).map(({ passwordHash, ...user }) => user)
  return NextResponse.json(safeUsers)
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

  const { users } = initializeMockData()
  const userStore = users as UserRecord[]
  const index = userStore.findIndex((user) => user.id === parsed.data.id)

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 })
  }

  userStore[index] = {
    ...userStore[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  }

  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać użytkownika." },
      { status: 500 }
    )
  }

  const { passwordHash: _passwordHash, ...safeUser } = userStore[index]
  void _passwordHash
  return NextResponse.json(safeUser)
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID użytkownika." }, { status: 400 })
  }

  const { users } = initializeMockData()
  const userStore = users as UserRecord[]
  const index = userStore.findIndex((user) => user.id === id)

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 })
  }

  userStore.splice(index, 1)
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
