'use client'
import React from 'react'
import Link from 'next/link'

interface LogType {
  href: string
  title: string
  subtitle: string
  color: string
  group: 'Clinical Episodes' | 'Procedures'
}

const LOG_TYPES: LogType[] = [
  // ── Clinical Episodes
  { href: '/logs/cases',     title: 'ICU / HDU Case',            subtitle: 'Patient episode with diagnosis, procedures & outcome', color: '#1E5A96', group: 'Clinical Episodes' },
  { href: '/logs/ward-reviews', title: 'Ward Review',            subtitle: 'Review of at-risk patient on general ward',           color: '#6366F1', group: 'Clinical Episodes' },
  { href: '/logs/transfers', title: 'Transfer',                  subtitle: 'Inter- or intra-hospital critical care transfer',     color: '#F59E0B', group: 'Clinical Episodes' },
  { href: '/logs/ed',        title: 'ED Attendance',             subtitle: 'Emergency department critical care involvement',      color: '#EF4444', group: 'Clinical Episodes' },
  { href: '/logs/medicine',  title: 'Medicine Placement',        subtitle: 'Out-of-ICU specialty placement',                     color: '#22C55E', group: 'Clinical Episodes' },
  // ── Procedures
  { href: '/logs/airway',        title: 'Airway Management',         subtitle: 'RSI, intubation, DAE, tracheostomy',           color: '#0891B2', group: 'Procedures' },
  { href: '/logs/arterial-line', title: 'Arterial Line',             subtitle: 'Arterial catheter insertion by site',          color: '#E11D48', group: 'Procedures' },
  { href: '/logs/cvc',           title: 'Central Venous Catheter',   subtitle: 'CVC / vascath insertion by site',              color: '#7C3AED', group: 'Procedures' },
  { href: '/logs/uss',           title: 'Ultrasound Study',          subtitle: 'POCUS — FICE, FAST, AAA, pleural, DVT…',      color: '#0F766E', group: 'Procedures' },
  { href: '/logs/regional-block', title: 'Regional Block',           subtitle: 'Nerve block from 45-item catalogue',           color: '#D97706', group: 'Procedures' },
]

const GROUPS: Array<'Clinical Episodes' | 'Procedures'> = ['Clinical Episodes', 'Procedures']

export default function LogsHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What would you like to log?</h1>
      </div>

      {GROUPS.map((group) => (
        <div key={group}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{group}</p>
          <div className="space-y-2">
            {LOG_TYPES.filter((l) => l.group === group).map((l) => (
              <Link key={l.href} href={`${l.href}/new`}>
                <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer">
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: l.color + '20' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{l.title}</p>
                    <p className="text-xs text-gray-500 truncate">{l.subtitle}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
