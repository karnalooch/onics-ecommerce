import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import { initializeMockData } from "@/store/serverStore"

export const dynamic = "force-dynamic"

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const { repairs } = initializeMockData()
  return NextResponse.json(repairs)
}
