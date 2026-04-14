# Zasady Nawigacji i Routingu (Next.js App Router)

1. **Brak halucynacji ścieżek**: Zawsze weryfikuj obecność plików i folderów w strukturze aplikacji (Next.js 15 App Router) przed wygenerowaniem linków. Nie zmyślaj ścieżek.
2. **Standardyzacja podziału B2C/B2B**: 
   - Ścieżki statyczne/B2C (ISR) muszą weryfikować nagłówki rewalidacji i być generowane pod kątem wydajności masowej.
   - Ścieżki B2B muszą obsługiwać React Suspense Boundaries (`loading.tsx`), z uwzględnieniem żądań przesyłania strumieniowego (Streaming).
3. **Prawidłowe mapowanie API**: Zapytania z aplikacji klienckiej kieruj do dedykowanych Route Handlers w `src/app/api/...`, zamiast odpytywać Strapi bezpośrednio w komponentach klienckich w celach bezpieczeństwa (proxy API), a bezpośrednie zapytania realizuj po stronie serwera komponentów (RSC).
