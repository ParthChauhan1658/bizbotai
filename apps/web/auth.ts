import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db, users, accounts, sessions, verificationTokens } from '@bizbot/database'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts as any,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env['AUTH_GOOGLE_ID']!,
      clientSecret: process.env['AUTH_GOOGLE_SECRET']!,
    }),
    Resend({
      apiKey: process.env['RESEND_API_KEY']!,
      from: process.env['RESEND_FROM_EMAIL'] ?? 'noreply@bizbot.in',
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, store the userId
      if (user?.id) {
        token['userId'] = user.id
      }

      // Always refresh role + businessId from DB so changes
      // (e.g. onboarding creating a business) are picked up
      // without requiring a re-login.
      const userId = (token['userId'] as string) ?? user?.id
      if (userId) {
        const [dbUser] = await db
          .select({
            id: users.id,
            role: users.role,
            businessId: users.businessId,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)

        if (dbUser) {
          token['role'] = dbUser.role
          token['businessId'] = dbUser.businessId
          token['userId'] = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token['userId'] as string
        session.user.role = token['role'] as string
        session.user.businessId = token['businessId'] as string | null
      }
      return session
    },
  },
})

// Extend session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      businessId: string | null
    }
  }
}
