import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { initializeMockData, saveMockData } from "@/store/serverStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, productName, expectedQuantity, message, companyNip, clientEmail } = body;

    if (!companyNip) {
      return NextResponse.json({ error: "Brak zidentyfikowanego NIP." }, { status: 403 });
    }
    
    if (!expectedQuantity || expectedQuantity < 1) {
      return NextResponse.json({ error: "Należy określić minimalny wolumen hurtowy." }, { status: 400 });
    }

    // Persist to JSON for Admin Dashboard visibility
    const { orders } = initializeMockData();
    const newQuote = {
      id: `QUOTE-${Date.now()}`,
      orderType: "INQUIRY",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      user: { email: clientEmail },
      totalPriceOrig: 0, // Będziemy negocjować
      productName,
      productId,
      quantity: expectedQuantity,
      message,
      nip: companyNip
    };

    (global as any).mockOrdersStore.push(newQuote);
    saveMockData();

    // Send email via Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.example.com",
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER || "user",
          pass: process.env.SMTP_PASS || "pass",
        },
      });

      await transporter.sendMail({
        from: `"Platforma B2B Celtronics" <${process.env.SMTP_USER || "noreply@celtronics.pl"}>`,
        to: process.env.ADMIN_EMAIL || "biuro@celtronics.pl",
        subject: `[LEAD B2B] Zapytanie | NIP: ${companyNip}`,
        html: `
          <h2>Nowe zapytanie w systemie hurtowym</h2>
          <ul>
            <li><strong>Produkt:</strong> ${productName} (ID: ${productId})</li>
            <li><strong>Sztuk:</strong> ${expectedQuantity}</li>
            <li><strong>NIP Podmiotu:</strong> ${companyNip}</li>
          </ul>
          <p><strong>Wiadomość:</strong> ${message}</p>
        `,
      });
    } catch (mailErr) {
      console.warn("Błąd wysyłki SMTP, ale zapytanie zapisane w bazie:", mailErr);
    }

    return NextResponse.json({ success: true, message: "Zapytanie zapisane w systemie i przesłane do Działu B2B." });

  } catch (error) {
    console.error("Błąd generowania zapytania:", error);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}
