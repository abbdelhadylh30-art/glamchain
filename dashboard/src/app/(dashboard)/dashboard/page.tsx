'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { LoginView } from '@/components/auth/login-view'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { AppointmentsView } from '@/components/appointments/appointments-view'
import { StylistsView } from '@/components/stylists/stylists-view'
import { CustomersView } from '@/components/customers/customers-view'
import { ServicesView } from '@/components/services/services-view'
import { FinancialsView } from '@/components/financials/financials-view'
import { SettingsView } from '@/components/settings/settings-view'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { currentPage, sidebarOpen, isAuthenticated, setAuthenticated } = useAppStore()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      setAuthenticated(true)
    } else if (status === 'unauthenticated') {
      setAuthenticated(false)
    }
  }, [status, session, setAuthenticated])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardView />
      case 'appointments':
        return <AppointmentsView />
      case 'stylists':
        return <StylistsView />
      case 'customers':
        return <CustomersView />
      case 'services':
      case 'inventory':
        return <ServicesView />
      case 'financials':
        return <FinancialsView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated || !session) {
    return <LoginView />
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        <Header />
        <main className="p-4 sm:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
