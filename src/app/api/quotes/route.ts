import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, productName, expectedQuantity, message, companyNip, clientEmail } = body;

    // Podstawowa weryfikacja
    if (!companyNip) {
      return NextResponse.json({ error: "Brak zidentyfikowanego NIP. Zapytania dot. cen netto są tylko dla zweryfikowanych partnerów." }, { status: 403 });
    }
    
    if (!expectedQuantity || expectedQuantity < 1) {
      return NextResponse.json({ error: "Należy określić minimalny wolumen hurtowy." }, { status: 400 });
    }

    // Odtworzenie obiektu dla Headless CMS (Strapi "Quotes" collection)
    const quotePayload = {
      data: {
        company_nip: companyNip,
        client_email: clientEmail,
        product_reference: productName,
        product_id: productId,
        quantity_requested: expectedQuantity,
        client_message: message || "Brak dodatkowej wiadomości.",
        status: "PENDING",
      }
    };

    /* 
      1. Komunikacja REST ze Strapi CMS w trybie ukrytym - zadeklarowana
    */

    /*
      2. Rzeczywista bramka serwera pocztowego - Nodemailer
    */
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
      to: "biuro@celtronics.pl", // Docelowa skrzynka biura
      subject: `[LEAD KSeF] Zapytanie Hurtowe B2B | NIP: ${companyNip}`,
      html: `
        <h2>Nowe zapytanie w systemie hurtowym</h2>
        <ul>
          <li><strong>Produkt:</strong> ${productName} (ID: ${productId})</li>
          <li><strong>Wolumen Sztuk:</strong> ${expectedQuantity}</li>
          <li><strong>E-mail instalatora:</strong> ${clientEmail || "Brak w sesji"}</li>
          <li><strong>NIP Podmiotu:</strong> ${companyNip}</li>
        </ul>
        <br/>
        <h3>Wiadomość z formularza:</h3>
        <p>${message}</p>
      `,
    });

    return NextResponse.json({ success: true, message: "Zapytanie ofertowe powędrowało do Działu B2B i oficjalnej skrzynki email." });

  } catch (error) {
    console.error("Błąd generowania zapytania:", error);
    return NextResponse.json({ error: "Błąd serwera podczas łączenia z systemami Ofert." }, { status: 500 });
  }
}
