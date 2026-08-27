'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getBusinessConfig } from '@/lib/config'
import { canAccessNav } from '@/lib/roles'
import {
  CalendarCheck2,
  CalendarDays,
  Scissors,
  Users,
  Megaphone,
  Package,
  Wallet,
  Settings,
  PanelLeftClose,
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

interface Location {
  id: string
  name: string
  city: string
}

const navGroups: { label: string; items: { id: string; label: string; icon: typeof CalendarDays; hint?: string }[] }[] = [
  {
    label: 'Your Day',
    items: [
      { id: 'dashboard', label: 'Today', icon: CalendarCheck2 },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    label: 'Grow',
    items: [
      { id: 'customers', label: 'Guests', icon: Users },
      { id: 'marketing', label: 'Marketing', icon: Megaphone, hint: 'New' },
    ],
  },
  {
    label: 'Salon',
    items: [
      { id: 'stylists', label: 'Artists', icon: Scissors },
      { id: 'services', label: 'Services & Stock', icon: Package },
      { id: 'financials', label: 'Financials', icon: Wallet },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

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
      .catch(() => {})
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#241c14]/55 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-[72px] border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c8a24b55] bg-gradient-to-br from-[#332814] to-[#221a12]">
              <Scissors className="w-4 h-4 text-sidebar-primary" />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-[1.05rem] font-semibold tracking-[0.06em] text-sidebar-foreground truncate">{businessConfig.name}</span>
              <span className="mt-0.5 block text-[8.5px] font-medium uppercase tracking-[0.34em] text-[#8d7f66]">Salon Studio</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Location selector */}
        <div className="px-4 py-3.5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#8d7f66]" />
            <span className="text-[10px] font-semibold text-[#8d7f66] uppercase tracking-[0.22em]">Location</span>
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full h-9 text-[13px] bg-[#2a2113] border-[#3a2f1d] text-sidebar-foreground hover:bg-[#2e2517] focus:ring-sidebar-ring">
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

        {/* Grouped navigation */}
        <ScrollArea className="flex-1">
          <nav className="px-3 py-4 space-y-5">
            {navGroups.map((group) => {
              const visible = group.items.filter(item => canAccessNav(userRole, item.id))
              if (!visible.length) return null
              return (
                <div key={group.label}>
                  <p className="px-3 mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.26em] text-[#7a6d55]">{group.label}</p>
                  <div className="space-y-0.5">
                    {visible.map((item) => {
                      const isActive = currentPage === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentPage(item.id as typeof currentPage)
                            if (window.innerWidth < 1024) setSidebarOpen(false)
                          }}
                          className={cn(
                            'group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-300',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-primary shadow-[inset_0_1px_0_rgba(200,162,75,0.08)]'
                              : 'text-sidebar-foreground/65 hover:bg-[#2a2113] hover:text-sidebar-foreground'
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-[#e9ce8c] to-[#b3903f]" />
                          )}
                          <item.icon className={cn('w-4 h-4 shrink-0 transition-transform duration-300', isActive ? 'text-sidebar-primary' : 'group-hover:scale-110')} />
                          <span className="truncate">{item.label}</span>
                          {item.hint && (
                            <span className="ml-auto rounded-full bg-[#c8a24b22] border border-[#c8a24b44] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-sidebar-primary">
                              {item.hint}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Footer — expand */}
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[#8d7f66] hover:text-sidebar-foreground hover:bg-[#2a2113] hidden lg:flex"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="w-4 h-4" />
            Collapse
          </Button>
        </div>
      </aside>
    </>
  )
}
