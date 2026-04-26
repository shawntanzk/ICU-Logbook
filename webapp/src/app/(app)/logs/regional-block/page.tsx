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
import type { RegionalBlockLog } from '@/types/database'

export default function RegionalBlockPage() {
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [logs, setLogs] = useState<RegionalBlockLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('regional_block_logs').select('*').is('deleted_at', null).order('date', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useRealtime((t) => { if (t === 'regional_block_logs') fetchLogs() })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('regional_block_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }
  const handleApprove = async (id: string) => {
    if (!user) return
    await supabase.from('regional_block_logs').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r: RegionalBlockLog) => formatDate(r.date) },
    { key: 'block_type', label: 'Block type', render: (r: RegionalBlockLog) => r.block_type === 'Other' ? r.block_type_other ?? 'Other' : r.block_type ?? '—' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'success', label: 'Success', render: (r: RegionalBlockLog) => r.success === true ? 'Yes' : r.success === false ? 'No' : '—' },
    { key: 'supervision_level', label: 'Supervision' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Regional Blocks</h1><p className="text-gray-500 text-sm">{logs.length} entries</p></div>
        <Link href="/logs/regional-block/new"><Button>+ Add regional block</Button></Link>
      </div>
      <Card>
        <LogTable data={logs} columns={columns} onDelete={handleDelete} onApprove={handleApprove} loading={loading} canApprove={user?.role === 'admin' || logs.some(l => l.supervisor_user_id === user?.id)} emptyMessage="No regional blocks logged yet." />
      </Card>
    </div>
  )
}
