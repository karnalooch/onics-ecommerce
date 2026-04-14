import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, nip, companyName } = await req.json();

    if (!email || !password || !nip || !companyName) {
      return NextResponse.json({ error: "Brak wymaganych danych autoryzacyjnych lub parametrów NIP/Firma." }, { status: 400 });
    }

    // Proxy do Strapi 5
    const strapiRes = await fetch("http://127.0.0.1:1337/api/auth/local/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: email,
        email,
        password,
        nip,
        companyName,
      }),
    });

    const data = await strapiRes.json();
    
    if (!strapiRes.ok) {
      return NextResponse.json({ error: data?.error?.message || "Odmowa po stronie serwera CMS." }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error("Błąd rejestracji Proxy", error);
    return NextResponse.json({ error: "Wystąpił błąd krytyczny sieci proxy." }, { status: 500 });
  }
}
