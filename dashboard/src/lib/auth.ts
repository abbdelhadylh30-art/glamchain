import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Extract client IP — works with both Web Request.headers.get()
        // (Next.js 15+ Web API) and Node.js IncomingMessage.headers
        // (Next.js ≤14 / NextAuth v4 internal req shape).
        let clientIp = 'unknown'
        try {
          const h = (req as any)?.headers
          if (h) {
            if (typeof h.get === 'function') {
              clientIp = h.get('x-forwarded-for')?.split(',')[0]?.trim()
                || h.get('x-real-ip')?.trim()
                || 'unknown'
            } else if (typeof h === 'object') {
              const xff = h['x-forwarded-for']
              const xri = h['x-real-ip']
              clientIp = (Array.isArray(xff) ? xff[0] : xff)?.trim()
                || (Array.isArray(xri) ? xri[0] : xri)?.trim()
                || 'unknown'
            }
          }
        } catch {
          // Defensive — if header extraction fails, fall back to 'unknown'
          // (rate limiter still works, just keyed on 'unknown')
        }

        // Rate limit login attempts by IP
        const rateCheck = await checkRateLimit(`login:${clientIp}`, RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.windowMs)
        if (!rateCheck.allowed) {
          throw new Error('Too many login attempts. Please wait a moment before trying again.')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.isActive) {
          return null
        }

        // Reject login if user has a tenant that's been deactivated
        if (user.tenantId) {
          const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
            select: { isActive: true },
          })
          if (!tenant?.isActive) {
            return null
          }
        }

        // Verify password using bcrypt
        const bcrypt = await import('bcryptjs')
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: String(user.role),
          locationId: user.locationId ?? undefined,
          tenantId: user.tenantId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.locationId = (user as { locationId?: string }).locationId
        token.tenantId = (user as { tenantId?: string }).tenantId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.locationId = token.locationId as string | undefined
        session.user.tenantId = token.tenantId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    id: string
    role: string
    locationId?: string
    tenantId?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      locationId?: string
      tenantId?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    locationId?: string
    tenantId?: string
  }
}
