'use client'

import { useSession, signOut } from 'next-auth/react'
import { useAppStore } from '@/lib/store'
import {
  Menu,
  Bell,
  LogOut,
  Settings,
  CalendarPlus,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/lib/roles'
import { format } from 'date-fns'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Today', subtitle: 'Your salon at a glance' },
  appointments: { title: 'Appointments', subtitle: 'The book, week by week' },
  stylists: { title: 'Artists', subtitle: 'Your chairs and who fills them' },
  customers: { title: 'Guests', subtitle: 'The people who make it all work' },
  marketing: { title: 'Marketing', subtitle: 'Fill the quiet hours' },
  services: { title: 'Services & Stock', subtitle: 'The menu and what it needs' },
  inventory: { title: 'Stock', subtitle: 'What is running low' },
  financials: { title: 'Financials', subtitle: 'Where the riyals go' },
  settings: { title: 'Settings', subtitle: 'Tune your studio' },
}

export function Header() {
  const { data: session } = useSession()
  const { currentPage, sidebarOpen, setSidebarOpen, setCurrentPage } = useAppStore()

  const userName = session?.user?.name || 'User'
  const userRole = session?.user?.role || 'staff'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const meta = pageMeta[currentPage] || pageMeta.dashboard
  const isToday = new Date().toDateString()
  const todayLabel = format(new Date(), 'EEEE, d MMMM')

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    useAppStore.getState().setAuthenticated(false)
  }

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-[#f6f1e7]/92 backdrop-blur-xl border-b border-[#e5dcc8]">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-[#6b5d4a] hover:bg-[#efe7d6] hover:text-[#2a221a]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-[1.35rem] font-semibold leading-none text-[#2a221a] truncate">{meta.title}</h1>
              <span className="hidden sm:inline text-[12px] text-[#8a7d68] truncate">{isToday ? todayLabel : meta.subtitle}</span>
            </div>
            <p className="mt-1 hidden text-[11.5px] text-[#a3947a] sm:block">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick action — new booking */}
          <Button
            size="sm"
            className="gm-btn-gold h-9 gap-1.5 rounded-full px-4 hidden sm:inline-flex"
            onClick={() => setCurrentPage('appointments')}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            New Booking
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative text-[#6b5d4a] hover:bg-[#efe7d6] hover:text-[#2a221a]" aria-label="Notifications">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#f6f1e7] bg-[#b37158]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-[12px] uppercase tracking-wider text-[#8a7d68]">Needs your eye</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => setCurrentPage('appointments')}>
                <span className="gm-chip h-8 w-8 shrink-0"><CalendarClock className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#2a221a]">Appointments pending</p>
                  <p className="text-[11.5px] text-[#8a7d68]">Confirm requests waiting on you</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => setCurrentPage('services')}>
                <span className="gm-chip h-8 w-8 shrink-0"><AlertTriangle className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#2a221a]">Stock check</p>
                  <p className="text-[11.5px] text-[#8a7d68]">Items at or below minimum</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-[#efe7d6]">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-[#c8a24b] to-[#96742c] text-[#fffaef] text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-medium hidden sm:inline text-[#2a221a]">{userName}</span>
                <Badge variant="secondary" className={`${ROLE_BADGE_COLORS[userRole as keyof typeof ROLE_BADGE_COLORS] || 'bg-[#efe7d6] text-[#6b5d4a] text-[10px]'} hidden md:inline-flex px-1.5 py-0`}>
                  {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] || userRole}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCurrentPage('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
