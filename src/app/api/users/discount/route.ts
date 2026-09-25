import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData, saveMockData } from "@/store/serverStore"

type DiscountUser = {
  id: string
  discount?: number
  tierName?: string
  [key: string]: unknown
}

const DiscountSchema = z.object({
  id: z.string().min(1),
  discount: z.coerce.number().min(0).max(100),
  tierName: z.string().trim().min(1).max(40).default("PARTNER"),
})

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = DiscountSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowy rabat." },
        { status: 400 }
      )
    }

    const { users } = initializeMockData()
    const userStore = users as DiscountUser[]
    const userIndex = userStore.findIndex(
      (user) => user.id === parsed.data.id
    )

    if (userIndex === -1) {
      return NextResponse.json(
        { error: "Nie znaleziono użytkownika." },
        { status: 404 }
      )
    }

    userStore[userIndex].discount = parsed.data.discount
    userStore[userIndex].tierName = parsed.data.tierName.toUpperCase()

    if (!saveMockData()) {
      return NextResponse.json(
        { error: "Nie udało się zapisać rabatu." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, user: userStore[userIndex] })
  } catch (error) {
    console.error("Discount update error:", error)
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 })
  }
}
