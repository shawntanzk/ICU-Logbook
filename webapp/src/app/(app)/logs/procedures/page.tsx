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
import type { ProcedureLog } from '@/types/database'

export default function ProceduresPage() {
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [logs, setLogs] = useState<ProcedureLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('procedure_logs').select('*').is('deleted_at', null).order('created_at', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useRealtime((t) => { if (t === 'procedure_logs') fetchLogs() })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await supabase.from('procedure_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }

  const handleApprove = async (id: string) => {
    if (!user) return
    await supabase.from('procedure_logs').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
    fetchLogs()
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (r: ProcedureLog) => formatDate(r.created_at) },
    { key: 'procedure_type', label: 'Type' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'success', label: 'Success', render: (r: ProcedureLog) => r.success === true ? 'Yes' : r.success === false ? 'No' : '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Procedures</h1><p className="text-gray-500 text-sm">{logs.length} entries</p></div>
        <Link href="/logs/procedures/new"><Button>+ Add procedure</Button></Link>
      </div>
      <Card>
        <LogTable data={logs} columns={columns} onDelete={handleDelete} onApprove={handleApprove} loading={loading} canApprove={user?.role === 'admin'} emptyMessage="No procedures logged yet." />
      </Card>
    </div>
  )
}
