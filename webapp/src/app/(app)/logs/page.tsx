'use client'
import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const LOG_TYPES = [
  { href: '/logs/cases', label: 'ICU Cases', icon: '🏥', description: 'Record ICU admissions and clinical cases' },
  { href: '/logs/procedures', label: 'Procedures', icon: '🔧', description: 'General procedure log' },
  { href: '/logs/airway', label: 'Airway Management', icon: '😮‍💨', description: 'Intubations and airway procedures' },
  { href: '/logs/arterial-line', label: 'Arterial Lines', icon: '🩸', description: 'Arterial line insertions' },
  { href: '/logs/cvc', label: 'Central Venous Catheters', icon: '💉', description: 'CVC, PICC, and vascath insertions' },
  { href: '/logs/uss', label: 'Ultrasound', icon: '📡', description: 'Point-of-care ultrasound studies' },
  { href: '/logs/regional-block', label: 'Regional Blocks', icon: '🫀', description: 'Regional anaesthesia and nerve blocks' },
  { href: '/logs/ward-reviews', label: 'Ward Reviews', icon: '📝', description: 'Outreach and ward review consultations' },
  { href: '/logs/transfers', label: 'Transfers', icon: '🚑', description: 'Intra- and inter-hospital transfers' },
  { href: '/logs/ed', label: 'ED Attendances', icon: '🚨', description: 'Emergency department attendances' },
  { href: '/logs/medicine', label: 'Medicine Placements', icon: '⚕️', description: 'Medicine and specialty placements' },
]

export default function LogsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
        <p className="text-gray-500 text-sm">Select a log type to view, add, or manage entries</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOG_TYPES.map((log) => (
          <Link key={log.href} href={log.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{log.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{log.label}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{log.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
