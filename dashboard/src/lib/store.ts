import { create } from 'zustand'

type Page = 'dashboard' | 'appointments' | 'stylists' | 'customers' | 'marketing' | 'services' | 'inventory' | 'financials' | 'settings'

interface AppState {
  currentPage: Page
  selectedLocation: string
  sidebarOpen: boolean
  isAuthenticated: boolean
  userRole: string
  setCurrentPage: (page: Page) => void
  setSelectedLocation: (locationId: string) => void
  setSidebarOpen: (open: boolean) => void
  setAuthenticated: (auth: boolean) => void
  setUserRole: (role: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  selectedLocation: 'all',
  sidebarOpen: true,
  isAuthenticated: false,
  userRole: 'staff',
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedLocation: (locationId) => set({ selectedLocation: locationId }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setUserRole: (role) => set({ userRole: role }),
}))
