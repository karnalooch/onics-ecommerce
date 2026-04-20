import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, nip, companyName } = await req.json();

    if (!email || !password || !nip || !companyName) {
      return NextResponse.json({ error: "Brak wymaganych danych autoryzacyjnych lub parametrów NIP/Firma." }, { status: 400 });
    }

    const { initializeMockData, saveMockData } = await import("@/store/serverStore");
    const { users } = initializeMockData();

    // Sprawdzamy czy użytkownik już istnieje
    if (users.some((u: any) => u.email === email)) {
      return NextResponse.json({ error: "Użytkownik o tym adresie email już istnieje." }, { status: 400 });
    }

    const newUser = {
      id: `u_${Date.now()}`,
      username: email,
      email,
      nip,
      companyName,
      roleType: "BIZ",
      isApproved: false, // Wymaga zatwierdzenia przez admina
      isBlocked: false,
      createdAt: new Date().toISOString(),
      jwt: `mock-jwt-${Date.now()}`
    };

    (global as any).mockUsersStore.push(newUser);
    saveMockData();

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Błąd rejestracji JSON:", error);
    return NextResponse.json({ error: "Wystąpił błąd podczas zapisu w bazie danych." }, { status: 500 });
  }
}
