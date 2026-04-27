'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { ApprovalBadge } from '@/components/logs/ApprovalBadge'
import { formatDate } from '@/lib/utils'
import { useRealtime } from '@/hooks/useRealtime'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface RecentEntry {
  id: string
  date: string
  type: string
  description: string
  approved_at: string | null
}

export default function DashboardPage() {
  const supabase = createClient()
  const autoSync = useAppStore((s) => s.autoSync)
  const setAutoSync = useAppStore((s) => s.setAutoSync)

  const [stats, setStats] = useState({
    totalCases: 0,
    totalProcedures: 0,
    approved: 0,
    pending: 0,
  })
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [cases, procedures, airway, arterial, cvc, uss, rb, wr, transfers, ed, medicine] = await Promise.all([
      supabase.from('case_logs').select('id, date, diagnosis, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('procedure_logs').select('id, created_at, procedure_type, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('airway_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('arterial_line_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('cvc_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('uss_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('regional_block_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('ward_review_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('transfer_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('ed_attendance_logs').select('id, date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
      supabase.from('medicine_placement_logs').select('id, start_date, approved_at').is('deleted_at', null).eq('owner_id', user.id),
    ])

    const allCases = cases.data ?? []
    const allProcs = procedures.data ?? []

    const allItems = [
      ...allCases.map((c) => ({ ...c, type: 'Case', description: c.diagnosis })),
      ...allProcs.map((p) => ({ ...p, date: p.created_at, type: 'Procedure', description: p.procedure_type })),
    ]

    const allApproved = [
      ...allCases, ...allProcs,
      ...(airway.data ?? []), ...(arterial.data ?? []),
      ...(cvc.data ?? []), ...(uss.data ?? []),
      ...(rb.data ?? []), ...(wr.data ?? []),
      ...(transfers.data ?? []), ...(ed.data ?? []),
      ...(medicine.data ?? []),
    ]

    const approvedCount = allApproved.filter((r) => r.approved_at).length
    const pendingCount = allApproved.filter((r) => !r.approved_at).length

    setStats({
      totalCases: allCases.length,
      totalProcedures: allProcs.length,
      approved: approvedCount,
      pending: pendingCount,
    })

    setRecent(
      allItems
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    )
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const { isSubscribed } = useRealtime((table) => {
    if (['case_logs', 'procedure_logs'].includes(table)) {
      fetchData()
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Your training logbook overview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Auto-sync</span>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSync ? 'bg-primary-700' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          {!autoSync && (
            <Button size="sm" variant="secondary" onClick={fetchData}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Cases" value={stats.totalCases} icon="🏥" />
            <StatCard title="Procedures" value={stats.totalProcedures} icon="🔬" />
            <StatCard title="Approved" value={stats.approved} icon="✅" color="text-green-600" />
            <StatCard title="Pending" value={stats.pending} icon="⏳" color="text-yellow-600" />
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent entries</h2>
            {recent.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No entries yet. <Link href="/logs/cases/new" className="text-primary-700 hover:underline">Add your first case →</Link></p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={`${r.type}-${r.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 text-gray-700 font-medium">{r.type}</td>
                        <td className="px-3 py-2 text-gray-700">{r.description}</td>
                        <td className="px-3 py-2"><ApprovalBadge approvedAt={r.approved_at} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
