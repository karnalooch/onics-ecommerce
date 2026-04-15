"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported?: number; total?: number; error?: string } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Błąd sieci." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "700px" }}>
      <Link href="/admin" style={{ color: "#0056b3", marginBottom: "1.5rem", display: "inline-block" }}>← Powrót do panelu</Link>
      <h1 style={{ marginBottom: "0.5rem" }}>Import Cennika WF-Mag</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Wgraj wyeksportowany plik <strong>.xlsx</strong> lub <strong>.csv</strong> z programu WF-Mag.
        System automatycznie dopasuje produkty po kolumnie <code>Indeks/Kod/SKU</code> i zaktualizuje ceny i stany magazynowe.
      </p>

      <div style={{ background: "#f8f9fa", border: "1px dashed #ccc", borderRadius: "8px", padding: "2rem", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Oczekiwane kolumny w pliku</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Kolumna WF-Mag</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Warianty Nazwy</th>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>Wymagane?</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Indeks", "SKU, Kod, Symbol", "✅ Tak"],
              ["Nazwa", "Opis, Name", "✅ Tak"],
              ["Cena", "Cena netto, Price, CenaNetto", "✅ Tak"],
              ["Stan", "Ilosc, Ilość", "Opcjonalne"],
              ["Kategoria", "Grupa, Category", "Opcjonalne"],
            ].map(([col, variants, req]) => (
              <tr key={col} style={{ borderBottom: "1px solid #dee2e6" }}>
                <td style={{ padding: "0.5rem" }}><code>{col}</code></td>
                <td style={{ padding: "0.5rem", color: "#666", fontSize: "0.85rem" }}>{variants}</td>
                <td style={{ padding: "0.5rem" }}>{req}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{ border: "2px dashed #0056b3", borderRadius: "8px", padding: "2rem", textAlign: "center", background: "#f0f4ff", cursor: "pointer" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null); }}
        >
          <input
            type="file"
            id="fileInput"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
          <label htmlFor="fileInput" style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "3rem" }}>📂</div>
            <p style={{ marginBottom: "0.5rem" }}>
              {file ? <strong style={{ color: "#0056b3" }}>✓ {file.name}</strong> : "Przeciągnij plik lub kliknij aby wybrać"}
            </p>
            <small style={{ color: "#888" }}>Obsługiwane formaty: .xlsx, .xls, .csv</small>
          </label>
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="btn btn-primary"
          style={{ padding: "0.75rem", fontSize: "1rem" }}
        >
          {loading ? "Importowanie..." : "Importuj do bazy danych"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: "1.5rem", padding: "1.5rem", borderRadius: "8px", background: result.error ? "#fde8e8" : "#e8f5e9", border: `1px solid ${result.error ? "#f5c6c6" : "#c8e6c9"}` }}>
          {result.error ? (
            <p style={{ color: "#c0392b" }}>❌ Błąd: {result.error}</p>
          ) : (
            <>
              <p style={{ color: "#27ae60", fontWeight: 600 }}>✅ Import zakończony sukcesem!</p>
              <p>Zaimportowano / zaktualizowano: <strong>{result.imported}</strong> z <strong>{result.total}</strong> wierszy.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
