'use client'
import React from 'react'
import { useAppStore } from '@/store/appStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  onMenuClick?: () => void
  isSubscribed?: boolean
}

export function TopBar({ onMenuClick, isSubscribed }: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3 ml-auto">
        {/* Realtime indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-400' : 'bg-gray-300'}`}
          />
          {isSubscribed ? 'Live' : 'Manual'}
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
