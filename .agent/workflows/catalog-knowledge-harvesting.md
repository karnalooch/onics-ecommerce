# Catalog Knowledge Harvesting Workflow

This workflow describes how to ingest technical data from distributor catalogs using either the deterministic local engine or the AI-augmented parser.

## Step 1: Ingestion & Upload
- Upload the file (XLSX, PDF) to the Knowledge Hub.
- **V7/V8 Internal Intelligence**: The system automatically detects file types and prepares the local heuristic engine.
- Observe the **Emerald Status Badge** ("Silnik Celtronics V8 Active") which confirms the system will use local, free resources.

## Step 2: Analysis Strategy
- **Excel Files (V7)**:
    - Automatically maps columns using weighted keyword scoring.
    - Validates structure via data sampling (10-row lookahead).
    - Optimizes for large files by early-exit on empty blocks (100 rows).
- **PDF Files (V8)**:
    - Uses heuristic regex and state-machine pattern matching (specifically optimized for BCS, Pulsar, and similar tabular layouts).
    - No API key is required for structured textual PDFs.

## Step 3: AI Augmentation (Optional)
- Use an **API Key** only if the local engine fails or for unstructured/image-only PDFs.
- Select the appropriate Gemini model (e.g., 1.5 Flash for speed, 1.5 Pro for complex layouts).

## Step 4: Verification
- Monitor real-time logs in the Training Modal.
- Check the `catalogKnowledge.json` store total count post-analysis.
- Verify unique products are correctly merged (normalized SKU/Model).

## Step 5: Export & Integration
- Knowledge is immediately available to the **AI Description Generator** and product management views.
- Export results to `E:\mkj_analiza_wynik.xlsx` for external verification if required.
