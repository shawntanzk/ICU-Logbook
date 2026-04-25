'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { COBATRICE_DOMAINS } from '@/lib/data'

function getColor(count: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-400'
  if (count <= 5) return 'bg-blue-100 text-blue-700'
  if (count <= 20) return 'bg-blue-300 text-blue-900'
  return 'bg-primary-700 text-white'
}

function getLabel(count: number): string {
  if (count === 0) return '0'
  if (count <= 5) return `${count}`
  if (count <= 20) return `${count}`
  return `${count}+`
}

export default function CompetencyPage() {
  const supabase = createClient()
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const counts: Record<string, number> = {}
    COBATRICE_DOMAINS.forEach((d) => { counts[d] = 0 })

    // Gather all tables that have cobatrice_domains
    const tables = [
      'case_logs',
      'ward_review_logs',
      'transfer_logs',
      'ed_attendance_logs',
      'medicine_placement_logs',
    ]

    await Promise.all(
      tables.map(async (table) => {
        const { data } = await supabase
          .from(table)
          .select('cobatrice_domains')
          .is('deleted_at', null)

        if (data) {
          data.forEach((row) => {
            const domains: string[] = row.cobatrice_domains ?? []
            domains.forEach((d) => {
              if (counts[d] !== undefined) {
                counts[d]++
              }
            })
          })
        }
      })
    )

    setDomainCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Competency Heatmap</h1>
        <p className="text-gray-500 text-sm">COBATRICE domain coverage across all log entries</p>
      </div>

      <Card>
        <div className="flex items-center gap-6 mb-6 text-xs">
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-gray-100 border" />0 cases</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-blue-100" />1–5 cases</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-blue-300" />6–20 cases</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-primary-700" />20+ cases</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {COBATRICE_DOMAINS.map((domain) => {
              const count = domainCounts[domain] ?? 0
              return (
                <div
                  key={domain}
                  className={`rounded-xl p-4 flex flex-col justify-between gap-2 ${getColor(count)}`}
                >
                  <p className="text-sm font-medium leading-snug">{domain}</p>
                  <p className="text-2xl font-bold">{getLabel(count)}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
