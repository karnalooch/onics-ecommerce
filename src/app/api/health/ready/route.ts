import { NextResponse } from "next/server"
import { evaluateReadiness } from "@/lib/health"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const readiness = evaluateReadiness()

  return NextResponse.json(
    {
      status: readiness.ready ? "ready" : "not_ready",
      checks: readiness.checks,
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
