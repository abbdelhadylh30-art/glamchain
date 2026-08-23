'use client'

import { useSession, signOut } from 'next-auth/react'
import { useAppStore } from '@/lib/store'
import { getBusinessConfig } from '@/lib/config'
import {
  Menu,
  Bell,
  ChevronRight,
  LogOut,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/lib/roles'

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  stylists: 'Stylists',
  customers: 'Customers',
  services: 'Services & Inventory',
  inventory: 'Inventory',
  financials: 'Financials',
  settings: 'Settings',
}

export function Header() {
  const { data: session } = useSession()
  const { currentPage, sidebarOpen, setSidebarOpen } = useAppStore()
  const businessConfig = getBusinessConfig()

  const userName = session?.user?.name || 'User'
  const userRole = session?.user?.role || 'staff'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    useAppStore.getState().setAuthenticated(false)
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => useAppStore.getState().setCurrentPage('dashboard')} className="cursor-pointer">
                  {businessConfig.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitles[currentPage] || 'Dashboard'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications — plain bell, no badge */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="w-4.5 h-4.5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">{userName}</span>
                <Badge variant="secondary" className={`${ROLE_BADGE_COLORS[userRole as keyof typeof ROLE_BADGE_COLORS] || 'bg-gray-100 text-gray-700 text-[10px]'} hidden md:inline-flex px-1.5 py-0`}>
                  {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] || userRole}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')}>
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
