import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  currentSubject: string
  setSubject: (subject: string) => void
  isSidebarOpen: boolean
  toggleSidebar: () => void
  userTier: 'free' | 'pro'
  setUserTier: (tier: 'free' | 'pro') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentSubject: 'General Science',
      setSubject: (subject) => set({ currentSubject: subject }),
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state })),
      userTier: 'free',
      setUserTier: (tier) => set({ userTier: tier }),
    }),
    {
      name: 'axomprep-storage',
    }
  )
)
