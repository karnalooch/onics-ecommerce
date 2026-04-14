# Zasady Modyfikacji Bazy Danych

1. **Zakaz użycia komend destrukcyjnych CLI**: Wywołania terminalowe naruszające fizyczną strukturę w sposób niekontrolowany (np. "DROP TABLE x", "DELETE FROM x") są absolutnie zabronione bez wcześniejszej i wyraźnej walidacji procedury migracji.
2. **Architektura PostgreSQL**: Każda relacja powinna być budowana świadomie przez Strapi (Content-Types Builder) z dbałością o referencyjną integralność (Foreign Keys).
3. **Zabezpieczenie przed uszkodzeniem struktury**: Przy wykonywaniu aktualizacji schematów przez kod (np. via migracje SQL lub config plików JSON z Strapi), najpierw analizuj powiązane byty, cenniki i RBAC.
4. **.env Only**: Konfiguracja połączenia bazy danych zawsze pobierana jest ze zmiennych środowiskowych - zabrania się "hardkodowania" danych dostępowych.
