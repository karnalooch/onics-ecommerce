import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { FieldWorkbench } from "./FieldWorkbench"

export default async function FieldPage() {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; name?: string | null }
    | undefined

  if (!sessionUser) redirect("/logowanie")

  const { users } = initializeMockData()
  const currentUser = findStoredUserBySession(
    users as Array<{
      id?: string
      email?: string
      username?: string
      companyName?: string
      roleType?: string
      isApproved?: boolean
      isBlocked?: boolean
      discount?: number
    }>,
    sessionUser
  )

  const allowed =
    currentUser &&
    !currentUser.isBlocked &&
    (currentUser.roleType === "ADMIN" ||
      (currentUser.roleType === "BIZ" && currentUser.isApproved))

  if (!allowed) redirect("/logowanie")

  return (
    <FieldWorkbench
      identity={
        currentUser.companyName ||
        currentUser.username ||
        currentUser.email ||
        "Instalator"
      }
      role={currentUser.roleType || "BIZ"}
      discount={Number(currentUser.discount || 0)}
    />
  )
}
