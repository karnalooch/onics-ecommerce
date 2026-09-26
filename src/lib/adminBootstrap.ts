import bcrypt from "bcrypt"
import { mutateMockData } from "@/store/serverStore"

type BootstrapUser = {
  id?: string
  email?: string
  roleType?: string
  isBlocked?: boolean
  passwordHash?: string
  updatedAt?: string
}

type SealBootstrapOptions = {
  userId?: string
  email?: string
  password: string
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function hasPasswordHash(user: BootstrapUser) {
  return typeof user.passwordHash === "string" && user.passwordHash.length > 0
}

function isBootstrapAdmin(user: BootstrapUser) {
  return user.roleType === "ADMIN" && !user.isBlocked && !hasPasswordHash(user)
}

function findAdmin(users: BootstrapUser[], options: SealBootstrapOptions) {
  return users.find(
    (user) =>
      user.roleType === "ADMIN" &&
      !user.isBlocked &&
      ((options.userId && user.id === options.userId) ||
        (options.email &&
          normalizeEmail(user.email) === normalizeEmail(options.email)))
  )
}

export function needsAdminBootstrap(users: unknown) {
  return (
    Array.isArray(users) &&
    users.some((user) => isBootstrapAdmin(user as BootstrapUser))
  )
}

export async function sealAdminBootstrapPassword(
  options: SealBootstrapOptions
) {
  const candidateHash = await bcrypt.hash(options.password, 12)

  return mutateMockData((db) => {
    const user = findAdmin(db.users as BootstrapUser[], options)
    if (!user) throw new Error("ADMIN_BOOTSTRAP_TARGET_INVALID")
    if (hasPasswordHash(user)) return user.passwordHash as string

    user.passwordHash = candidateHash
    user.updatedAt = new Date().toISOString()
    return candidateHash
  })
}
