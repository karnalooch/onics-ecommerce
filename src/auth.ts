import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import crypto from "crypto"

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function safeSecretEqual(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)

  if (candidateBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "CEL-TRONICS B2B",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "twoj-email@firma.pl" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email)
        const password = String(credentials?.password ?? "")

        if (!email || !password) return null

        const { initializeMockData } = await import("@/store/serverStore")
        const { users } = initializeMockData()
        const user = users.find(
          (entry: { email?: string }) => normalizeEmail(entry.email) === email
        )

        if (!user || user.isBlocked) return null

        let passwordValid = false

        if (typeof user.passwordHash === "string" && user.passwordHash.length > 0) {
          passwordValid = await bcrypt.compare(password, user.passwordHash)
        } else if (user.roleType === "ADMIN") {
          const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD
          passwordValid = Boolean(
            bootstrapPassword && safeSecretEqual(password, bootstrapPassword)
          )
        }

        if (!passwordValid) return null

        return {
          id: String(user.id),
          email: user.email,
          name: user.companyName || user.username || user.email,
          role: user.roleType,
          isApproved: Boolean(user.isApproved),
          nip: user.nip ?? null,
          discount: Number(user.discount ?? 0),
          tierName: user.tierName ?? "BASIC",
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = user.id
        token.isApproved = (user as { isApproved?: boolean }).isApproved
        token.nip = (user as { nip?: string | null }).nip
        token.discount = (user as { discount?: number }).discount
        token.tierName = (user as { tierName?: string }).tierName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & {
          role?: string
          id?: string
          isApproved?: boolean
          nip?: string | null
          discount?: number
          tierName?: string
        }

        sessionUser.role = typeof token.role === "string" ? token.role : undefined
        sessionUser.id = typeof token.id === "string" ? token.id : undefined
        sessionUser.isApproved = Boolean(token.isApproved)
        sessionUser.nip = typeof token.nip === "string" ? token.nip : null
        sessionUser.discount = Number(token.discount ?? 0)
        sessionUser.tierName =
          typeof token.tierName === "string" ? token.tierName : "BASIC"
      }
      return session
    },
  },
  pages: {
    signIn: "/logowanie",
  },
  session: {
    strategy: "jwt",
  },
})
