import { NextResponse } from "next/server";
import { getSolarTimes } from "@/lib/solarUtils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSolarTimes();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
