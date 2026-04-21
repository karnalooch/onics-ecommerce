"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, MessageSquare, Trash2 } from "lucide-react";

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
      <button 
        onClick={handleApprove} 
        disabled={loading} 
        className="pill-action bg-status-success text-white hover:brightness-110 active-press flex items-center gap-2"
      >
        <Check className="w-3.5 h-3.5" /> {loading ? "..." : "Zatwierdź"}
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
      <button 
        onClick={handleDelete} 
        disabled={loading} 
        className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-status-error hover:bg-slate-50 transition-all rounded-none active-press" 
        title="Usuń"
      >
        {loading ? "..." : <Trash2 className="w-3.5 h-3.5" />}
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
      return <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ARCHIVE</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={handleSendQuote} 
          disabled={loading} 
          className="pill-action bg-primary text-white hover:brightness-110 active-press flex items-center gap-2"
        >
          <MessageSquare className="w-3.5 h-3.5" /> {loading ? "..." : "Wyceń"}
        </button>
        <button 
          onClick={handleReject} 
          disabled={loading} 
          className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-status-error hover:bg-slate-50 transition-all active-press"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
