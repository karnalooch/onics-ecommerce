# CEL-TRONICS Ecommerce — Handover

Stan referencyjny: **26.09.2026**  
Bazowy `main`: **`48e214e7`**

> [!IMPORTANT]
> Ten plik jest krótkim punktem wejścia do aktualnej architektury i zasad pracy.
> Nie zastępuje `README.md` ani `PAYMENTS_PRODUCTION_RUNBOOK.md`.
> Jeśli dokument jest sprzeczny z kodem, CI lub runbookiem płatności, kod/CI/runbook są źródłem prawdy.

## 1. Aktualny stack

- Next.js **16.3.6** (App Router)
- React **19.2.4**
- Node.js **24**
- NextAuth 5 beta
- Zustand dla koszyka po stronie klienta
- Zod dla kontraktów wejściowych
- Vitest dla testów
- jedna aplikacja Next.js obsługująca public site, B2B, admin, katalog, zamówienia, wiedzę i płatności

Nie wracamy do informacji ze starego handoveru o Next.js 15.1 ani do `npm install --legacy-peer-deps`.

## 2. Uruchomienie lokalne

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Aplikacja developerska działa na:

```text
http://localhost:3001
```

Podstawowa walidacja przed PR:

```bash
npm run test:payments
npm test -- --run
npm run build
npm audit --audit-level=high
```

Pełne bramki PR wykonują również repo-policy/security checks, recovery drill i smoke produkcyjnych endpointów health.

## 3. Persistence — ważna granica architektury

Aplikacja nadal korzysta z file-backed store.

Development może używać lokalnego fallbacku, ale produkcja musi mieć jawne trwałe ścieżki:

```bash
CELTRONICS_DB_PATH=/persistent/celtronics/db.json
CELTRONICS_UPLOAD_ROOT=/persistent/celtronics/uploads
```

Aktualny wspierany model produkcyjny:

- **single writer / single application instance**,
- trwały writable volume,
- serializowane mutacje przez lock file,
- prywatny katalog uploadów poza `public/`,
- backup/verify/restore przez dostarczone skrypty.

Nie uruchamiać wielu writerów przeciwko temu samemu JSON DB. Horizontal scaling wymaga migracji do prawdziwej transakcyjnej bazy danych.

Nie traktować `src/data/db.json` jako docelowej produkcyjnej lokalizacji persistence.

Maintenance:

```bash
npm run db:verify
npm run db:backup
npm run db:restore -- --from /path/to/backup.json --confirm
```

## 4. Authentication i authorization

Aktualne zabezpieczenia obejmują między innymi:

- page/API RBAC,
- stabilne powiązanie sesji z kontem,
- blokadę dostępu dla zablokowanych/niezatwierdzonych kont B2B,
- throttling logowania i rejestracji,
- jednorazowy bootstrap ADMIN zakończony trwałym hashem,
- fail-closed readiness przy brakujących wymaganych sekretach.

W produkcji reverse proxy musi nadpisywać zaufane nagłówki IP zgodnie z opisem w `README.md`.

## 5. Commerce, orders i inventory

Kluczowa zasada: dane klienta nie są źródłem prawdy dla ceny, nazwy produktu ani stocku.

Serwer:

- rozwiązuje pozycje koszyka względem bieżącego katalogu,
- agreguje duplikaty produktów,
- stosuje warunki konta B2B,
- waliduje ceny i stock przy właściwym checkout/order flow,
- rezerwuje stock dla twardych zamówień/płatności zgodnie z inventory state machine,
- zabezpiecza exactly-once release/finalize/restock.

Nie poprawiać ręcznie stanów zamówień ani stocku w JSON.

## 6. XML order import

Import B2B ma jawny kontrakt:

`CELTRONICS_ORDER_XML_V1`

Właściwości:

- maks. 256 KiB,
- maks. 250 pozycji źródłowych,
- tylko SKU + quantity,
- bounded streaming ingress,
- UTF-8 fail-closed,
- brak DTD/ENTITY/CDATA/comments/namespaces/rozszerzeń,
- ceny/nazwy/rabaty/stock zawsze pochodzą z serwera,
- preview pokazuje accepted/rejected przed zmianą koszyka,
- finalny checkout ponownie waliduje połączony koszyk.

Szczegóły: `docs/order-import-xml-v1.md`.

## 7. Oferta PDF / druk z koszyka

Przycisk oferty w koszyku nie jest już atrapą ani `window.print()` całego UI.

Flow:

1. klient przechodzi do dedykowanego widoku oferty,
2. `POST /api/cart/offer-preview` ponownie rozwiązuje produkty i ceny na serwerze,
3. powstaje czysty dokument B2B,
4. użytkownik wybiera **Drukuj / Zapisz jako PDF**.

Oferta nie rezerwuje magazynu. Dostępność i finalne warunki są ponownie sprawdzane przy składaniu właściwego zamówienia.

## 8. Payment subsystem — frozen production baseline

Obsługiwani providerzy:

- Stripe,
- manual bank transfer,
- Przelewy24.

Łańcuch produkcyjny obejmuje:

provider registry → configuration/control plane → activation preflight → checkout → inventory reservation → verified settlement → webhook replay protection → refund/RMA → reconciliation/recovery → readiness → emergency shutdown → acceptance CI → runbook.

Najważniejsze invariants są blokująco testowane przez:

```bash
npm run test:payments
```

Nie dodawać kolejnych payment abstractions bez konkretnego wymagania lub błędu.

Operacje, go-live, incident response, emergency shutdown, P24 recovery i backup/restore:

`PAYMENTS_PRODUCTION_RUNBOOK.md`

Szczególnie ważne:

- customer redirect nigdy nie jest financial truth,
- P24 wymaga signed notification + provider verify,
- emergency shutdown blokuje nowe płatności wszystkich providerów,
- automatyczne wygaszanie otwartych sesji dotyczy tylko bezpiecznie obsługiwalnych sesji Stripe,
- rozpoczęte P24 nadal muszą przechodzić przez webhook/reconciliation.

## 9. Health / readiness

Endpointy:

- `GET /api/health/live`
- `GET /api/health/ready`

Readiness sprawdza lokalną gotowość storage/auth/payment config bez wykonywania sieciowych probe'ów providerów.

## 10. CI / governance

Aktualne bramki PR:

- Site PR CI,
- Platform Audit CI,
- Payment production acceptance,
- file-store recovery drill,
- production build,
- health/readiness smoke,
- dependency audit,
- Aggregate CI gate.

### Znany otwarty blocker GitHub governance

Issue **#16** pozostaje otwarte.

Na 26.09.2026 GitHub raportuje dla `main`:

- `protected: false`,
- brak aktywnych rulesetów.

Docelowo `main` powinien wymuszać:

- wejście zmian przez PR,
- wymagany `aggregate-ci-gate`,
- strict/up-to-date checks,
- blokadę force push,
- blokadę usunięcia brancha.

Nie uznawać governance za domknięte, dopóki ustawienia repozytorium nie zostaną faktycznie włączone i zweryfikowane.

## 11. Zasady dalszej pracy

- małe, logiczne PR-y,
- nie omijać Aggregate CI,
- nie ufać cenom/stockowi/statusom z klienta,
- nie wykonywać zewnętrznych requestów wewnątrz file-store write lock,
- nie edytować ręcznie payment/inventory truth w JSON,
- nie cofać payment provider architecture do warunków typu `if Stripe` poza adapter/capability layer,
- nowe produkcyjne flow powinny mieć testowane invariants, fail-closed validation i jasny kontrakt operacyjny.

## 12. Następne granice architektury

Świadomie poza obecnym baseline:

1. migracja file-backed DB do transakcyjnej bazy danych przed multi-instance/horizontal scaling,
2. repo governance z realnie chronionym `main` (#16).

Pozostałe prace traktować jako produktowy polish / konkretne wymagania, a nie pretekst do dalszej abstrakcji zamkniętych subsystemów.
