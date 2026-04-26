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
import type { ArterialLineLog } from '@/types/database'

export default function ArterialLinePage() {
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [logs, setLogs] = useState<ArterialLineLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('arterial_line_logs').select('*').is('deleted_at', null).order('date', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useRealtime((t) => { if (t === 'arterial_line_logs') fetchLogs() })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('arterial_line_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }
  const handleApprove = async (id: string) => {
    if (!user) return
    await supabase.from('arterial_line_logs').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r: ArterialLineLog) => formatDate(r.date) },
    { key: 'site', label: 'Site' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'success', label: 'Success', render: (r: ArterialLineLog) => r.success === true ? 'Yes' : r.success === false ? 'No' : '—' },
    { key: 'supervision_level', label: 'Supervision' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Arterial Lines</h1><p className="text-gray-500 text-sm">{logs.length} entries</p></div>
        <Link href="/logs/arterial-line/new"><Button>+ Add arterial line</Button></Link>
      </div>
      <Card>
        <LogTable data={logs} columns={columns} onDelete={handleDelete} onApprove={handleApprove} loading={loading} canApprove={user?.role === 'admin' || logs.some(l => l.supervisor_user_id === user?.id)} emptyMessage="No arterial lines logged yet." />
      </Card>
    </div>
  )
}
