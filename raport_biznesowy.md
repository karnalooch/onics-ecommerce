# Raport wdrożenia — Knowledge Hub

Stan referencyjny: **26.09.2026**

## Cel modułu

Knowledge Hub służy do ekstrakcji danych technicznych z katalogów dostawców i przygotowania ich do weryfikacji przez administratora. Moduł obsługuje pliki PDF oraz Excel, a dla PDF może opcjonalnie używać modelu Gemini.

Ekstrakcja AI ani heurystyczna nie jest źródłem prawdy dla danych handlowych.

## Aktualny przepływ

1. Administrator wgrywa prywatny katalog dostawcy.
2. Serwer waliduje nazwę, format i limity uploadu.
3. Parser lokalny lub AI wyciąga modele, parametry, producenta, klasyfikację i cenę katalogową, jeśli jest dostępna.
4. Wynik jest zapisywany w osobnym magazynie wiedzy (`knowledgeEntries`).
5. Dane trafiają do warstwy staging/weryfikacji.
6. Dopiero jawna akcja administratora może zsynchronizować wiedzę z istniejącym produktem albo promować nowy SKU do katalogu.

### Granica bezpieczeństwa

Samo wgranie lub przeanalizowanie PDF/XLS:

- nie zmienia aktywnej ceny sprzedaży,
- nie nadpisuje live produktu,
- nie tworzy automatycznie sprzedawalnego SKU,
- nie rezerwuje ani nie zmienia magazynu.

Cena znaleziona w katalogu dostawcy jest danymi referencyjnymi (`catalogPrice`), a nie automatycznie ceną sprzedaży.

## Co działa dzisiaj

- prywatne przechowywanie uploadów poza katalogiem `public/`,
- limit pojedynczego pliku 25 MiB,
- ograniczony rozmiar całego requestu multipart przed parsowaniem,
- obsługa XLS/XLSX/XLSM,
- heurystyczna ekstrakcja PDF,
- opcjonalna ekstrakcja PDF przez Gemini,
- walidacja i normalizacja wpisów wiedzy,
- osobny storage wiedzy,
- staging przed zmianą katalogu handlowego,
- jawna synchronizacja istniejącego produktu z IQ Hub,
- eksport bazy wiedzy,
- generator opisu produktu korzystający z wiedzy katalogowej.

## Czego nie deklarujemy bez pomiaru

Nie ma obecnie danych pomiarowych pozwalających uczciwie twierdzić, że moduł:

- skraca pracę o konkretny procent,
- przetwarza określoną liczbę produktów w gwarantowanym czasie,
- zapewnia określoną, stałą dokładność ekstrakcji,
- działa bezobsługowo 24/7.

Takie wskaźniki powinny wynikać z rzeczywistych pomiarów na katalogach używanych przez zespół.

## Zachowanie podczas odświeżenia strony

Aktualny trening korzysta ze strumienia SSE powiązanego z żądaniem klienta. Minimalizacja modalu i nawigacja w ramach zamontowanego interfejsu mogą zachować trwającą sesję, ale pełne odświeżenie strony lub zerwanie połączenia może przerwać analizę.

`sessionStorage` odtwarza wyłącznie stan interfejsu i logi; nie jest kolejką zadań działającą niezależnie od przeglądarki.

Jeżeli wymagane będzie rzeczywiste „refresh-proof”, kolejnym krokiem powinien być serwerowy job runner z trwałym stanem zadania i endpointem do ponownego podłączenia lub pollingu.

## Wartość biznesowa

Obecna wartość modułu polega na ograniczeniu ręcznego przepisywania katalogów i ujednoliceniu procesu:

**dokument dostawcy → ekstrakcja → wiedza/staging → weryfikacja administratora → katalog handlowy**

Wpływ na czas pracy, liczbę błędów i koszt operacyjny powinien być mierzony na realnych importach przed publikowaniem konkretnych KPI.

## Dalszy rozwój

Priorytetem jest utrzymanie bezpiecznej granicy pomiędzy danymi wyekstrahowanymi a commerce source-of-truth. Potencjalne kolejne etapy to trwałe zadania background, lepszy workflow zatwierdzania zmian oraz mierzalne metryki jakości parsera.
