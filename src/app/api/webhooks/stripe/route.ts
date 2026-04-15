import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Tajny klucz webhoook ze Stripe (konfigurowany w .env)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json({ error: 'Brak nagłówka stripe-signature' }, { status: 400 });
    }

    // Rekomendowane zjawisko walidacji podpisu z użyciem surowego body (Krypto-hash)
    const sigHeaders = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (!sigHeaders.t || !sigHeaders.v1) {
      return NextResponse.json({ error: 'Błędny nagłówek signature' }, { status: 400 });
    }

    const signedPayload = `${sigHeaders.t}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (expectedSignature !== sigHeaders.v1) {
      return NextResponse.json({ error: 'Nieprawidłowa sygnatura Webhooka Stripe' }, { status: 400 });
    }

    // Walidacja poprawna, parsujemy zdarzenie
    const event = JSON.parse(rawBody);

    // Weryfikacja typu zdarzenia Stripe
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded':
      case 'payment_captured':
        const session = event.data.object;
        
        // Wymuszenie parametru PL NIP na profilu dla systemów e-Faktur (KSeF)
        const plNip = session.metadata?.pl_nip || session.customer_details?.tax_ids?.[0]?.value;
        
        if (!plNip && event.type === 'checkout.session.completed') {
           console.warn('Transakcja zakończona, jednak brak NIP (pl_nip). Transakcja B2C lub błąd walidacji po stronie logowania.');
           // Tutaj obsługa fallback dla klienta detalicznego / ISR revalidation call
        } else {
           console.log(`Płatność zatwierdzona dla firmy z NIP: ${plNip}`);
           // Poniżej można użyć funkcji proxy komunikującej się z Strapi 5 (Backend)
        }
        break;
      
      default:
        console.log(`Nieobsługiwany typ zdarzenia webhooka: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Błąd Webhooka Stripe:', error);
    return NextResponse.json({ error: 'Błąd przetwarzania webhooka' }, { status: 500 });
  }
}
