'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { classNames } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/logs', label: 'Logs', icon: '📋' },
  { href: '/competency', label: 'Competency', icon: '🎯' },
  { href: '/export', label: 'Export', icon: '📥' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const user = useAppStore((s) => s.user)

  return (
    <>
      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={classNames(
          'fixed top-0 left-0 h-full w-64 bg-primary-700 text-white z-30 flex flex-col transition-transform duration-300',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary-700 font-bold text-sm">ICU</span>
            </div>
            <div>
              <p className="font-bold text-white leading-tight">ICU Logbook</p>
              <p className="text-xs text-primary-200">Clinical Logbook</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={classNames(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-white/20 text-white'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <span>👥</span>
              Admin
            </Link>
          )}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.display_name ?? 'User'}</p>
              <p className="text-xs text-primary-200 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
