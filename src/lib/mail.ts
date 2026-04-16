import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface QuoteNotification {
  adminEmail: string;
  clientEmail: string;
  clientCompany: string;
  quoteId: string;
  items: { name: string; sku: string; quantity: number; price: number }[];
}

export async function sendQuoteRequestEmail(data: QuoteNotification) {
  const itemsHtml = data.items.map(i =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name} <small>(${i.sku})</small></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.price.toFixed(2)} zł</td>
    </tr>`
  ).join("");

  const mailOptions = {
    from: `"System CEL-TRONICS" <${process.env.SMTP_USER}>`,
    to: data.adminEmail,
    subject: `[Nowe Zapytanie #${data.quoteId.slice(-6)}] - ${data.clientCompany}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 8px; overflow: hidden;">
        <div style="background: #0b1d3a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">CEL-TRONICS B2B</h1>
          <p style="color: #90a0b7; margin: 4px 0 0;">Panel Sprzedaży – Nowe Zapytanie Ofertowe</p>
        </div>
        <div style="padding: 32px; background: white;">
          <h2 style="color: #0b1d3a; margin-top: 0;">Nowe zapytanie od instalatora</h2>
          <p><strong>Firma:</strong> ${data.clientCompany}<br>
          <strong>Email:</strong> ${data.clientEmail}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left; font-size: 13px;">Produkt</th>
                <th style="padding: 10px; text-align: left; font-size: 13px;">Ilość</th>
                <th style="padding: 10px; text-align: left; font-size: 13px;">Cena Kat.</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/admin" 
             style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #e63946; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Przejdź do Panelu i Wyceń →
          </a>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #888;">
          Email wygenerowany automatycznie przez system CEL-TRONICS • Nie odpowiadaj na tę wiadomość
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendQuoteResponseEmail(clientEmail: string, quoteId: string, deliveryDays: number, discount: number) {
  const mailOptions = {
    from: `"CEL-TRONICS B2B" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `[Oferta #${quoteId.slice(-6)}] Twoja wycena jest gotowa`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0b1d3a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">CEL-TRONICS B2B</h1>
        </div>
        <div style="padding: 32px; background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0b1d3a;">Twoja wycena jest gotowa ✅</h2>
          <p>Przygotowaliśmy indywidualną ofertę dla Ciebie:</p>
          <div style="background: #f1f9f1; border-left: 4px solid #27ae60; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
            <p style="margin: 0;"><strong>Dodatkowy rabat:</strong> ${discount}%</p>
            <p style="margin: 8px 0 0;"><strong>Czas realizacji:</strong> ${deliveryDays} dni roboczych</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/sklep/zapytania" 
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0b1d3a; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Przejdź do swojego konta →
          </a>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendApprovalEmail(clientEmail: string, companyName: string) {
  const mailOptions = {
    from: `"CEL-TRONICS B2B" <${process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `[Ważne] Twoje konto instalatora zostało zatwierdzone`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0b1d3a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">CEL-TRONICS B2B</h1>
        </div>
        <div style="padding: 32px; background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0b1d3a;">Witaj w platformie B2B, ${companyName || "Instalatorze"}! ✅</h2>
          <p>Twoje konto pomyślnie przeszło weryfikację. Masz teraz dostęp do cenników instalatorskich oraz możliwość składania zapytań ofertowych.</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/sklep" 
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0b1d3a; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Zaloguj się do platformy →
          </a>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
