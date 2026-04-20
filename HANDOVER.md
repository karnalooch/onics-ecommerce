# CELTRONICS PROJECT - HANDOVER MANIFEST (Stan na Koniec Dnia)

> [!IMPORTANT]
> Ten plik określa aktualną pozycję operacyjną z Phase 9 B2B E-Commerce. Wczytaj go jako pierwszy na stacji domowej (lub daj mi go przeczytać w nowej sesji), abyśmy wznowili pracę bez tracenia cennego kontekstu z dzisiejszego dnia!

## Zbudowana Architektura
1. **Frontend (Next.js 15.1 - App Router)**
   - Wdrożono warstwę premium E-Commerce na `TailwindCSS` z autorskimi komponentami (Glassmorphism).
   - Przeorganizowano autoryzację `NextAuth` w architekturze Bez-Prismy (z wymuszeniem KSeF/NIP dla kont B2B).
   - Koszyk zbudowany na globalnym E-Store `Zustand` z w pełni oprogramowaną funkcją Checkout API dla operatora `Stripe` (/api/checkout).
   - B2B Dashboard: Wyizolowana trasa `/(b2b)/oferty` która ignoruje transakcje detaliczne w zamian narzucając okno "Zapytania Ofertowego".
2. **Architektura Wszystko-w-Jednym (Unified)**
   - Wszystkie dane (produkty, użytkownicy, zamówienia) są przechowywane w pliku `src/data/db.json`.
   - Usunięto zależność od Strapi oraz bazy PostgreSQL (folder `celtronics-backend` został skasowany).
   - Projekt jest teraz w 100% przenośną aplikacją Next.js.

## Procedura Odpalenia (PC Domowy / Praca)

1. **Instalacja:**
   - `npm install --legacy-peer-deps` w głównym katalogu.
2. **Klucze:**
   - Upewnij się, że masz plik `.env` z kluczami Stripe, NextAuth Secret i SMTP (skopiuj go z pendrive'a).
3. **Start:**
   - Otwórz terminal i wpisz: `npm run dev`
   - Aplikacja działa pod adresem: [http://localhost:3001](http://localhost:3001)
