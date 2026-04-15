import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // Najnowsze stabilne API kompatybilne z webhooks
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, role, nip } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Koszyk jest pusty" }, { status: 400 });
    }

    // Walidacja praw KSeF (NIP jest obligatoryjny dla ról BIZ i rabatów net)
    if (role === 'BIZ' && !nip) {
      return NextResponse.json({ error: "Podmiot biznesowy musi zweryfikować ważny NIP przed transakcją B2B." }, { status: 403 });
    }

    // Tworzenie "line_items" z asortymentu Koszyka (Zustand state)
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'pln',
        // Obliczenie ceny z groszami. Zakładamy, że item.price w B2C to Brutto, a B2B to Netto + mechanizmy w Webhooku
        unit_amount: Math.round(item.price * 100), 
        product_data: {
          name: item.name,
          metadata: {
            sku: item.sku || 'UNKNOWN',
            strapiId: item.id
          }
        },
      },
      quantity: item.quantity,
    }));

    // Konfiguracja do płatności z możliwością Blik/P24 ustawianą w kokpicie Stripe (automatic_payment_methods)
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'p24', 'blik'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/zamowienie/sukces?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/koszyk`,
      metadata: {
        pl_nip: nip || null,
        client_role: role || 'RETAIL'
      }
    };

    // Stwórz i zwróć sesję Stripe
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ id: session.id, url: session.url });

  } catch (error: any) {
    console.error("Błąd generowania bramki checkout:", error);
    return NextResponse.json({ error: error.message || "Błąd serwera." }, { status: 500 });
  }
}
