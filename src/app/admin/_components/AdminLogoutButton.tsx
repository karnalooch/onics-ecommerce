"use client"

import { signOut } from "next-auth/react"

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      className="min-h-11 w-full rounded-lg border border-[var(--ops-border)] px-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
    >
      Wyloguj
    </button>
  )
}
