"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActions({ actionType, userId, quoteId, currentStatus }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (actionType === "approveUser") {
    const handleApprove = async () => {
      setLoading(true);
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, isApproved: true })
      });
      router.refresh();
      setLoading(false);
    };

    return (
      <button onClick={handleApprove} disabled={loading} className="btn-sm btn-approve">
        {loading ? "..." : "✅ Zatwierdź"}
      </button>
    );
  }

  if (actionType === "deleteUser") {
    const handleDelete = async () => {
      if (!confirm("Czy na pewno chcesz trwale usunąć tego instalatora?")) return;
      setLoading(true);
      await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });
      router.refresh();
      setLoading(false);
    };

    return (
      <button onClick={handleDelete} disabled={loading} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Usuń zgłoszenie">
        {loading ? "..." : "✕"}
      </button>
    );
  }

  if (actionType === "processQuote") {
    const handleSendQuote = async () => {
      const deliveryDays = prompt("Czas realizacji w dniach roboczych (np. 5):");
      if (deliveryDays === null) return;
      const discount = prompt("Dodatkowy rabat % dla klienta (np. 10, lub 0 jeśli brak):");
      if (discount === null) return;

      setLoading(true);
      await fetch("/api/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quoteId,
          status: "QUOTED",
          deliveryTimeDays: parseInt(deliveryDays) || null,
          additionalDiscount: parseFloat(discount) || 0
        })
      });
      alert("✅ Wycena wysłana! Klient zostanie powiadomiony e-mailem.");
      router.refresh();
      setLoading(false);
    };

    const handleReject = async () => {
      if (!confirm("Czy na pewno chcesz odrzucić to zapytanie?")) return;
      setLoading(true);
      await fetch("/api/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quoteId, status: "REJECTED", deliveryTimeDays: null, additionalDiscount: 0 })
      });
      router.refresh();
      setLoading(false);
    };

    if (currentStatus !== "PENDING") {
      return <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Brak akcji</span>;
    }

    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={handleSendQuote} disabled={loading} className="btn-sm btn-quote">
          {loading ? "..." : "💬 Wyceń"}
        </button>
        <button onClick={handleReject} disabled={loading} className="btn-sm btn-reject">
          ✕
        </button>
      </div>
    );
  }

  return null;
}
