# CELTRONICS PROJECT - HANDOVER MANIFEST (Stan na Koniec Dnia)

> [!IMPORTANT]
> Ten plik określa aktualną pozycję operacyjną z Phase 9 B2B E-Commerce. Wczytaj go jako pierwszy na stacji domowej (lub daj mi go przeczytać w nowej sesji), abyśmy wznowili pracę bez tracenia cennego kontekstu z dzisiejszego dnia!

## Zbudowana Architektura
1. **Frontend (Next.js 15.1 - App Router)**
   - Wdrożono warstwę premium E-Commerce na `TailwindCSS` z autorskimi komponentami (Glassmorphism).
   - Przeorganizowano autoryzację `NextAuth` w architekturze Bez-Prismy (z wymuszeniem KSeF/NIP dla kont B2B).
   - Koszyk zbudowany na globalnym E-Store `Zustand` z w pełni oprogramowaną funkcją Checkout API dla operatora `Stripe` (/api/checkout).
   - B2B Dashboard: Wyizolowana trasa `/(b2b)/oferty` która ignoruje transakcje detaliczne w zamian narzucając okno "Zapytania Ofertowego".
2. **Backend / CMS**
   - Ścieżka `/celtronics-backend` zawiera ukrytą instancję **Strapi 5**, którą w Faza_8 spięto z PostgreSQL.
   - Posiadamy działający `api/quotes/route.ts` - RESTowy symulator SMTP (Nodemailer) wysyłający leade'y od klientów hurtowych prosto na firmowego maila.
   - **Nowy Generator Ofert B2B:** Całkowicie przearanżowano UI na układ 3-kolumnowy (Edytor/Koszyk - Podgląd PDF - Przeglądarka Produktów). Wprowadzono system kategorii pionowych na prawym marginesie, co pozwala na błyskawiczne dodawanie urządzeń jednym kliknięciem.
   - **Dashboard Admina:** Dodano możliwość usuwania zgłoszeń oczekujących instalatorów oraz naprawiono ścieżki API dla akcji zatwierdzania.
   - **Inteligentny Generator:** Wprowadzono listę podpowiedzi (Autocomplete) dla nazw firm w generatorze ofert. System teraz automatycznie uzupełnia NIP po znalezieniu klienta w bazie i pozwala na zwinięcie sekcji danych ("Zatwierdź"), zwiększając przestrzeń roboczą.
   - **Serwis / RMA:** Dodano system ręcznego wprowadzania urządzeń do kolejki serwisowej bezpośrednio przez administratora (przypadek telefonu od klienta).
   - **Moduł Klienci (CRM):** Wdrożono zarządzanie portfolio klientów B2B/B2C z hard-blokadą logowania (`isBlocked`) sprzężoną z auth.js na poziomie Store'a.
   - **Zarządzanie Kategoriami:** Odwzorowano w pełni drzewiaste zarządzanie kategoriami z WF-Maga (z lewym menu wyboru). Wynik eksportowany jest prosto do API filtrowania.
   - **Centrum Zarządzania Produktami:** Całkowicie przebudowany komponent na architekturę "use client" ze wspomaganiem Filtrowania.
   - **Import WF-Mag Staging (Poczekalnia):** Wdrożony system ładowania prawdziwych arkuszy .XLS lokalnie (SheetJS). Zamiast surowego zapisu do bazy stawia on system "Poczekalni" i koloruje margines zysków/strat (Diffing cen). Wspiera tzw. Akceptację Pojedynczą (Per-item Commit) oraz nowości korzystają ze zintegrowanego modelu AI przypisywania do kategorii na podstawie Słów Kluczowych!

## Procedura Odpalenia na Nowej Maszynie (Domowej PC)
Aby odpalić projekt i rozpocząć pracę tam gdzie ją skończyliśmy:

1. **Zignoruj śmieci systemowe:** Jeśli przenosisz folder pendrivem – na domowym PC KONIECZNIE usuń stare foldery `node_modules` i `.next` w głównym katalogu `Cloude` oraz w backendzie. Różne komputery mogą mieć inną strukturę systemu/binarną!
2. **Czysta Re-Instalacja z Package.json:** 
   - Wykonaj `npm install --legacy-peer-deps` na głównym katalogu Front-endu.
   - Wykonaj `npm install` w `/celtronics-backend` dla zaplecza CMS (jeśli trzeba).
3. **Zabezpieczenie Środowiska (Klucze):** Nie zapomnij przekopiować na pendrive plików `.env` (domyślnie są ukryte!). Potrzebujesz odtworzyć Stripe KEYS, NEXTAUTH_SECRET oraz tokeny od serwera SMTP (z endpointu quotes), inaczej funkcje serwerowe zaczną wyrzucać errory bezpieczeństwa 500!
4. **Usługi Węzła (Node):** Wykonaj podwójny start:
   - Terminal 1: `npm run dev` na froncie.
   - Terminal 2: `npm run develop` w /celtronics-backend.
   - Uruchom też aplikację Docker Desktop, jeśli instalacja bazy dla Strapi będzie tego wymagać o poranku.
