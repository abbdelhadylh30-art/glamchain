'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getBusinessConfig } from '@/lib/config'
import { ROLE_HIERARCHY, NAV_ACCESS, canAccessNav } from '@/lib/roles'
import type { RoleType } from '@/lib/roles'
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  Package,
  DollarSign,
  Settings,
  ChevronLeft,
  MapPin,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect, useState } from 'react'

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments' as const, label: 'Appointments', icon: Calendar },
  { id: 'stylists' as const, label: 'Stylists', icon: Scissors },
  { id: 'customers' as const, label: 'Customers', icon: Users },
  { id: 'services' as const, label: 'Services & Inventory', icon: Package },
  { id: 'financials' as const, label: 'Financials', icon: DollarSign },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

// Nav access and role hierarchy are imported from @/lib/roles (single source of truth)

interface Location {
  id: string
  name: string
  city: string
}

export function Sidebar() {
  const { currentPage, setCurrentPage, selectedLocation, setSelectedLocation, sidebarOpen, setSidebarOpen, userRole } = useAppStore()
  const [locations, setLocations] = useState<Location[]>([])
  const businessConfig = getBusinessConfig()

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.locations) setLocations(data.locations)
      })
      .catch((err) => { console.error('Failed to fetch:', err) })
  }, [])

  // Filter nav items based on user role (using shared canAccessNav)
  const visibleNavItems = navItems.filter(item => canAccessNav(userRole, item.id))

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">{businessConfig.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Location Selector */}
        <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</span>
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="px-3 py-4 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id)
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn('w-4.5 h-4.5', isActive && 'text-sidebar-primary')} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hidden lg:flex"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="w-4 h-4" />
            Collapse
          </Button>
        </div>
      </aside>
    </>
  )
}
