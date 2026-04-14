# MANIFEST AGENTA (AGENT.md) - Explicit Caching Rules

## Główne Zasady (Core Rules)
1. **Strict TypeScript**: TypeScript obowiązuje bezwzględnie we wszystkich warstwach aplikacji. Należy używać silnego typowania, unikać `any`, definiować precyzyjne interfejsy i typy dla każdej funkcji i komponentu.
2. **Package Manager**: Zawsze używaj **pnpm** do zarządzania zależnościami (np. `pnpm install`, `pnpm add`). Unikaj `npm` i `yarn`.
3. **Brak Redundancji (DRY)**: Optymalizuj kod pod kątem reużywalności. Zapobiegaj powielaniu logiki, stosując współdzielone serwisy, hooki oraz funkcje narzędziowe (utils).
4. **Programowanie Funkcjonalne w UI**: Komponenty interfejsu (Next.js/React) muszą być pisane funkcyjnie. Wystrzegaj się mutacji stanu (immutable state), korzystaj z czystych funkcji i standardowych hooków.
5. **Context Caching**: System plików konfiguracji (`AGENT.md`, `.agent/rules/`) jest traktowany jako stały punkt odniesienia do oszczędności tokenów i unikania halucynacji kontekstu.

Każde zapytanie operacyjne musi respektować ten dokument oraz zasady umieszczone w folderze `.agent/rules/`.
