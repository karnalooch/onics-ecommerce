import { NextResponse } from "next/server"
import crypto from "crypto"

function safeEqual(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  if (candidateBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
}

export async function POST(req: Request) {
  const secret = process.env.WF_MAG_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Import WF-Mag nie jest skonfigurowany." },
      { status: 503 }
    )
  }

  const authHeader = req.headers.get("authorization") || ""
  const expectedHeader = `Bearer ${secret}`

  if (!safeEqual(authHeader, expectedHeader)) {
    return NextResponse.json({ error: "Nieautoryzowany dostęp." }, { status: 401 })
  }

  try {
    const rawData = await req.text()
    if (!rawData.trim()) {
      return NextResponse.json({ error: "Brak danych do importu." }, { status: 400 })
    }

    return NextResponse.json(
      {
        error:
          "Legacy endpoint nie importuje jeszcze rzeczywistych danych WF-Mag. Użyj importera w panelu administracyjnym.",
      },
      { status: 501 }
    )
  } catch (error) {
    console.error("Błąd podczas importu WF-Mag:", error)
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 })
  }
}
