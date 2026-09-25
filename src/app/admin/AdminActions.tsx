"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, MessageSquare, Trash2, X } from "lucide-react"

type AdminActionProps = {
  actionType: "approveUser" | "deleteUser" | "processQuote"
  userId?: string
  quoteId?: string
  currentStatus?: string
}

export default function AdminActions({
  actionType,
  userId,
  quoteId,
  currentStatus,
}: AdminActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const run = async (
    input: RequestInfo | URL,
    init: RequestInit,
    successMessage?: string
  ) => {
    setLoading(true)
    try {
      const response = await fetch(input, init)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        window.alert(payload.error || "Operacja nie powiodła się.")
        return
      }
      if (successMessage) window.alert(successMessage)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (actionType === "approveUser" && userId) {
    return (
      <button
        onClick={() =>
          void run("/api/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId, isApproved: true }),
          })
        }
        disabled={loading}
        className="pill-action flex items-center gap-2 bg-status-success text-white"
      >
        <Check className="h-3.5 w-3.5" /> {loading ? "..." : "Zatwierdź"}
      </button>
    )
  }

  if (actionType === "deleteUser" && userId) {
    return (
      <button
        onClick={() => {
          if (!window.confirm("Trwale usunąć konto partnera?")) return
          void run(`/api/users?id=${encodeURIComponent(userId)}`, {
            method: "DELETE",
          })
        }}
        disabled={loading}
        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-red-600"
        title="Usuń"
      >
        {loading ? "..." : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    )
  }

  if (actionType === "processQuote" && quoteId) {
    if (!["PENDING", "INQUIRY"].includes(currentStatus || "")) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {currentStatus || "ARCHIWUM"}
        </span>
      )
    }

    const quote = async () => {
      const delivery = window.prompt("Czas realizacji w dniach roboczych:")
      if (delivery === null) return
      const discount = window.prompt("Dodatkowy rabat % (0-100):", "0")
      if (discount === null) return

      await run(
        "/api/quotes",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: quoteId,
            status: "QUOTED",
            deliveryTimeDays: Number(delivery),
            additionalDiscount: Number(discount),
          }),
        },
        "Wycena została zapisana."
      )
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => void quote()}
          disabled={loading}
          className="pill-action flex items-center gap-2 bg-primary text-white"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {loading ? "..." : "Wyceń"}
        </button>
        <button
          onClick={() => {
            if (!window.confirm("Odrzucić to zapytanie?")) return
            void run("/api/quotes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: quoteId,
                status: "REJECTED",
                deliveryTimeDays: null,
                additionalDiscount: 0,
              }),
            })
          }}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-red-600"
          aria-label="Odrzuć zapytanie"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return null
}
