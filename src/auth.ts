import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// import { initializeMockData } from "@/store/serverStore";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Logowanie Strapi",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "twoj-email@firma.pl" },
        password: { label: "Hasło", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { initializeMockData } = await import("@/store/serverStore");
        const { users } = initializeMockData();
        const mockUser = users.find((u: any) => u.email === credentials.email);

        if (credentials.password === "test" && mockUser) {
           if (mockUser.isBlocked) {
             console.log("Logowanie odrzucone - konto zablokowane:", mockUser.email);
             return null; // Konto zablokowane
           }

           return {
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.companyName || mockUser.username,
              jwt: mockUser.jwt,
              role: mockUser.roleType,
              isApproved: mockUser.isApproved,
              nip: mockUser.nip,
              discount: mockUser.discount,
              tierName: mockUser.tierName
           } as any;
        }

        try {
          // Autoryzacja przez instancję Strapi CMS
          const res = await fetch("http://127.0.0.1:1337/api/auth/local", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              identifier: credentials.email,
              password: credentials.password
            })
          });

          const data = await res.json();

          if (!res.ok) {
            console.error("Błąd autoryzacji Strapi:", data?.error?.message);
            return null;
          }

          // Transformacja zwrotu ze Strapi do postaci sesji NextAuth
          if (data.user && data.jwt) {
            return {
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.companyName || data.user.username,
              // Strapi Custom Fields
              jwt: data.jwt,
              role: data.user.roleType || 'BIZ',
              isApproved: data.user.isApproved ?? false,
              nip: data.user.nip || null,
              discount: data.user.discount || 0,
              tierName: data.user.tierName || 'PARTNER'
            } as any;
          }

          return null;
        } catch (error) {
          console.error("Błąd połączenia krytycznego w NextAuth API:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.jwt = (user as any).jwt;
        token.role = (user as any).role;
        token.id = user.id;
        token.isApproved = (user as any).isApproved;
        token.nip = (user as any).nip;
        token.discount = (user as any).discount;
        token.tierName = (user as any).tierName;
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).jwt = token.jwt;
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).isApproved = token.isApproved;
        (session.user as any).nip = token.nip;
        (session.user as any).discount = token.discount;
        (session.user as any).tierName = token.tierName;
      }
      return session
    }
  },
  pages: {
    signIn: "/logowanie",
  },
  session: {
    strategy: "jwt",
  }
})
