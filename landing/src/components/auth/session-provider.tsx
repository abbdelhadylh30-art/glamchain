'use client'

import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { setAuthenticated, setUserRole } = useAppStore()

  useEffect(() => {
    if (session?.user) {
      setAuthenticated(true)
      setUserRole((session.user as { role?: string | null }).role || 'staff')
    } else {
      setAuthenticated(false)
      setUserRole('staff')
    }
  }, [session, setAuthenticated, setUserRole])

  return <>{children}</>
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionSync>{children}</SessionSync>
    </NextAuthSessionProvider>
  )
}
