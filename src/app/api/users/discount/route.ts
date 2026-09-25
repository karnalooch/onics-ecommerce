import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authorizeAPI } from "@/lib/authUtils";
import { initializeMockData, saveMockData } from "@/store/serverStore";

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  try {
    const { id, discount, tierName } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const numDiscount = Number(discount);
    if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
      return NextResponse.json({ error: "Nieprawidłowa wartość rabatu (0-100)" }, { status: 400 });
    }

    const cleanTierStr = String(tierName || "PARTNER").trim().toUpperCase();

    const { users } = initializeMockData();
    const userIndex = users.findIndex((u: any) => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update in mock store
    users[userIndex].discount = numDiscount;
    users[userIndex].tierName = cleanTierStr;

    if (!saveMockData()) {
      return NextResponse.json({ error: "Nie udało się zapisać rabatu." }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: users[userIndex] });
  } catch (e) {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
