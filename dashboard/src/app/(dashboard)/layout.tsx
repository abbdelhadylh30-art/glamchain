import { SessionProvider } from '@/components/auth/session-provider'
import { Toaster } from '@/components/ui/toaster'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  )
}
