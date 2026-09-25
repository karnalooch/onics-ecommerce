import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, saveMockData } from "@/store/serverStore"

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
  isApproved?: boolean
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

  const sessionUser = authCheck.user as SessionUser
  const currentUser = authCheck.currentUser
  if (authCheck.currentRole === "BIZ" && !currentUser.isApproved) {
    return NextResponse.json(
      { error: "Konto B2B oczekuje na zatwierdzenie." },
      { status: 403 }
    )
  }

  try {
    const parsed = CreateRepairSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe zgłoszenie." },
        { status: 400 }
      )
    }

    const { repairs } = initializeMockData()
    const repair = {
      id: `RMA-${crypto.randomUUID()}`,
      item: parsed.data.item,
      serial: parsed.data.serial,
      description: parsed.data.description,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      status: "WERYFIKACJA",
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        companyName: currentUser.companyName || currentUser.username || sessionUser.name,
      },
    }

    repairs.unshift(repair)

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić zgłoszenia.")
    }

    return NextResponse.json(repair, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
