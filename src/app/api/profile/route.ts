import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { readBoundedJson } from "@/lib/boundedJsonIngress"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { nextUserRevision, userRevision } from "@/lib/userResponse"

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
  revision?: number | null
}

const UpdateProfileSchema = z.object({
  phone: z.string().trim().max(50).optional().default(""),
  address: z.string().trim().max(250).optional().default(""),
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
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
    revision: userRevision(user.revision),
  })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const body = await readBoundedJson(req)
  if (!body.ok) {
    return NextResponse.json(
      {
        error:
          body.error === "too-large"
            ? "Żądanie aktualizacji profilu jest zbyt duże."
            : "Nieprawidłowy JSON profilu.",
      },
      { status: body.error === "too-large" ? 413 : 400 }
    )
  }

  const parsed = UpdateProfileSchema.safeParse(body.value)
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
          "Aktualizacja profilu wymaga expectedRevision z ostatniego odczytu.",
      },
      { status: 428 }
    )
  }

  try {
    const sessionUser = authCheck.user as SessionUser
    const submission = await mutateMockData((db) => {
      const user = findStoredUserBySession(db.users as ProfileUser[], sessionUser)
      if (!user) throw new Error("PROFILE_NOT_FOUND")
      if (user.isBlocked) throw new Error("ACCOUNT_BLOCKED")

      const currentRevision = userRevision(user.revision)
      const isReplay =
        String(user.phone ?? "").trim() === parsed.data.phone &&
        String(user.address ?? "").trim() === parsed.data.address

      if (parsed.data.expectedRevision !== currentRevision) {
        if (isReplay) {
          return {
            phone: user.phone || "",
            address: user.address || "",
            revision: currentRevision,
            replayed: true,
          }
        }
        throw new Error("PROFILE_REVISION_CONFLICT")
      }

      if (isReplay) {
        return {
          phone: user.phone || "",
          address: user.address || "",
          revision: currentRevision,
          replayed: true,
        }
      }

      user.phone = parsed.data.phone
      user.address = parsed.data.address
      user.revision = nextUserRevision(currentRevision)

      return {
        phone: user.phone,
        address: user.address,
        revision: user.revision,
        replayed: false,
      }
    })

    return NextResponse.json(
      {
        success: true,
        phone: submission.phone,
        address: submission.address,
        revision: submission.revision,
      },
      {
        headers: submission.replayed
          ? { "Idempotency-Replayed": "true" }
          : undefined,
      }
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "PROFILE_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono profilu." }, { status: 404 })
    }
    if (code === "ACCOUNT_BLOCKED") {
      return NextResponse.json({ error: "Konto jest zablokowane." }, { status: 403 })
    }
    if (code === "PROFILE_REVISION_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Profil zmienił się od ostatniego odczytu. Odśwież stronę i ponów zmianę.",
          code: "PROFILE_REVISION_CONFLICT",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać profilu." },
      { status: 500 }
    )
  }
}
