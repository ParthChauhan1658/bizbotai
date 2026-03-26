import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db, users, accounts, sessions, verificationTokens, businesses } from '@bizbot/database'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
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
      if (user?.id) {
        // Fetch user with business info
        const [dbUser] = await db
          .select({
            id: users.id,
            role: users.role,
            businessId: users.businessId,
          })
          .from(users)
          .where(eq(users.id, user.id))
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
