'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/database'

interface AppState {
  user: Profile | null
  autoSync: boolean
  setUser: (user: Profile | null) => void
  setAutoSync: (val: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      autoSync: true,
      setUser: (user) => set({ user }),
      setAutoSync: (val) => set({ autoSync: val }),
    }),
    {
      name: 'icu-logbook-store',
      partialize: (state) => ({ autoSync: state.autoSync }),
    }
  )
)
