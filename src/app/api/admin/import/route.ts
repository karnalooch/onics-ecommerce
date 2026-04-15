import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // WF-Mag zazwyczaj przesyła surowe zrzuty pamięci lub XML multipart.
    const rawData = await req.text();
    
    // Autoryzacja po stronie API Route (nagłówek x-api-key lub z uwierzytelnieniu ERP)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.WF_MAG_SECRET}`) {
      return NextResponse.json({ error: 'Nieautoryzowany dostęp od rzekomego ERP' }, { status: 401 });
    }

    if (!rawData) {
      return NextResponse.json({ error: 'Brak payloadu (XML/CSV).' }, { status: 400 });
    }

    // W tym miejscu w systemach Middleware parsujemy np. XML za pomocą `fast-xml-parser`
    // i przygotowujemy JSON obj. Tutaj wysyłamy zmodyfikowany payload Strapi Rest.
    
    // Przykładowe uderzenie Proxy na Backend
    /*
    const strapiRes = await fetch("http://127.0.0.1:1337/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.STRAPI_API_TOKEN}`
      },
      body: JSON.stringify({ data: { sku: 'WF-MOCK-1', name: 'Zasilacz Awaryjny', price: 120.00 } })
    });
    */

    console.log("Odebrano pomyślnie zrzut ERP WF-Mag. Skierowano do Headless CMS Strapi.");

    return NextResponse.json({
      success: true,
      message: 'Zrzut asortymentu ERP pomyślnie przeprocesowany.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Błąd podczas integracji WF-Mag:", error);
    return NextResponse.json({ error: "Błąd serwera. Połączenie z CMS odrzucone." }, { status: 500 });
  }
}
