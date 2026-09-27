import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  nextUserRevision,
  toSafeUserResponse,
  userRevision,
} from "@/lib/userResponse"
import { mutateMockData } from "@/store/serverStore"

type DiscountUser = {
  id: string
  discount?: number
  tierName?: string
  revision?: number | null
  [key: string]: unknown
}

const DiscountSchema = z.object({
  id: z.string().min(1),
  discount: z.coerce.number().min(0).max(100),
  tierName: z.string().trim().min(1).max(40).default("PARTNER"),
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
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

    if (parsed.data.expectedRevision === undefined) {
      return NextResponse.json(
        {
          error:
            "Zmiana warunków handlowych wymaga expectedRevision z ostatniego odczytu.",
        },
        { status: 428 }
      )
    }

    const submission = await mutateMockData((db) => {
      const userStore = db.users as DiscountUser[]
      const userIndex = userStore.findIndex(
        (candidate) => candidate.id === parsed.data.id
      )

      if (userIndex === -1) throw new Error("USER_NOT_FOUND")

      const current = userStore[userIndex]
      const currentRevision = userRevision(current.revision)
      const nextTier = parsed.data.tierName.toUpperCase()
      const isReplay =
        Number(current.discount ?? 0) === parsed.data.discount &&
        String(current.tierName ?? "").trim().toUpperCase() === nextTier

      if (parsed.data.expectedRevision !== currentRevision) {
        if (isReplay) {
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

      if (isReplay) {
        return {
          user: toSafeUserResponse({
            ...current,
            revision: currentRevision,
          }),
          replayed: true,
        }
      }

      current.discount = parsed.data.discount
      current.tierName = nextTier
      current.revision = nextUserRevision(currentRevision)
      return {
        user: toSafeUserResponse(current),
        replayed: false,
      }
    })

    return NextResponse.json(
      { success: true, user: submission.user },
      {
        headers: submission.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono użytkownika." },
        { status: 404 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "USER_REVISION_CONFLICT"
    ) {
      return NextResponse.json(
        {
          error:
            "Warunki konta zmieniły się od ostatniego odczytu. Odśwież dane i ponów zmianę.",
          code: "USER_REVISION_CONFLICT",
        },
        { status: 409 }
      )
    }

    console.error("Discount update error:", error)
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 })
  }
}
