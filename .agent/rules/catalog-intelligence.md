# Catalog Intelligence Rules (V9 - Battle-Hardened)

This rule defines the protocol for "Internal Intelligence" parsing of custom distributor price lists (XLSX/PDF). Updated to V9 during the "EMU Finalization" phase to prevent data pollution.

## Heuristic Intelligence (Excel V9)
1. **Letter Mandate**:
   - A string MUST contain at least one letter (A-Z) to be considered a valid `Product Code`.
   - Pure numeric strings < 10 digits are rejected as potential prices or row numbers.
2. **Price Integrity Shield**:
   - Reject any price containing scientific notation (`E+`, `E-`).
   - Reject any price that matches a numeric product code in the same row.
   - Reject any "price" that is a 12-14 digit GTIN/EAN code.
   - Global Price Cap: Ignore any value > 1,000,000 PLN.
3. **Smart Specs Merge (Multi-Tier)**:
   - Scan up to 3 header rows for "stacked labels" (e.g., `H` above `Wysokość`).
   - Merge all technical columns BETWEEN the detected `Model` and `Price` into a labeled `specs` string.
4. **Weighted Keyword Mapping**:
   - `MODEL_KEYWORDS`: SYMBOL, KOD, SKU, ARTYKUŁ, INDEKS (Weight: 100)
   - `SPECS_KEYWORDS`: OPIS, NAZWA, SPECYFIKACJA, PARAMETRY, CECHY (Weight: 100)
   - `PRICE_KEYWORDS`: NETTO, CENA, PRICE, PLN (Weight: 100)

## PDF Intelligence (Heuristic V9)
1. **Battery Protocol**:
   - Explicit whitelist support for brand prefixes that include spaces: `EP `, `AM `, `LFP `.
   - Detect codes with commas (e.g., `EP 7,2-12`) using enhanced regex grouping.
2. **Resilient Merging**:
   - Knowledge from PDFs is merged using the same deduplication logic as Excel.
3. **Internal Hierarchy**:
   - Default to "Local V9" state-machines for PULSAR, BCS, and EMU formats.

## Performance & Guardrails
- **Empty Block Optimization**: Breaking processing after 100 consecutive empty rows.
- **Barcode Protection**: Ignore purely numeric strings length >= 12 (EAN detection).
- **Quality Gate**: Every extraction must have a non-null Model and a non-null Price.

## When to use AI (Gemini)
- Only used for unstructured PDFs where local V9 heuristics fail.
- Requires active `apiKey` and manual user confirmation.
- Default is always the local V9 engine for cost-efficiency and determinism.
