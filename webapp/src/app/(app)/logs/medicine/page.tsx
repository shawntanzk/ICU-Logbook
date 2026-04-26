'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LogTable } from '@/components/logs/LogTable'
import { formatDate } from '@/lib/utils'
import { useRealtime } from '@/hooks/useRealtime'
import { useAppStore } from '@/store/appStore'
import type { MedicinePlacementLog } from '@/types/database'

export default function MedicinePage() {
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [logs, setLogs] = useState<MedicinePlacementLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('medicine_placement_logs').select('*').is('deleted_at', null).order('start_date', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useRealtime((t) => { if (t === 'medicine_placement_logs') fetchLogs() })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('medicine_placement_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }
  const handleApprove = async (id: string) => {
    if (!user) return
    await supabase.from('medicine_placement_logs').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }

  // medicine_placement_logs uses start_date not date; adapt for LogTable
  const adaptedLogs = logs.map(l => ({ ...l, date: l.start_date }))

  const columns = [
    { key: 'start_date', label: 'Start date', render: (r: MedicinePlacementLog) => formatDate(r.start_date) },
    { key: 'specialty', label: 'Specialty' },
    { key: 'hospital', label: 'Hospital' },
    { key: 'supervision_level', label: 'Supervision' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Medicine Placements</h1><p className="text-gray-500 text-sm">{logs.length} entries</p></div>
        <Link href="/logs/medicine/new"><Button>+ Add placement</Button></Link>
      </div>
      <Card>
        <LogTable data={adaptedLogs} columns={columns} onDelete={handleDelete} onApprove={handleApprove} loading={loading} canApprove={user?.role === 'admin' || logs.some(l => l.supervisor_user_id === user?.id)} emptyMessage="No medicine placements logged yet." />
      </Card>
    </div>
  )
}
