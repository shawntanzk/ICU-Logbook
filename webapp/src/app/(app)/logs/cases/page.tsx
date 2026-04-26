'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LogTable } from '@/components/logs/LogTable'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { useRealtime } from '@/hooks/useRealtime'
import { useAppStore } from '@/store/appStore'
import type { CaseLog } from '@/types/database'

export default function CasesPage() {
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [cases, setCases] = useState<CaseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchCases = useCallback(async () => {
    let query = supabase
      .from('case_logs')
      .select('*')
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    const { data } = await query
    setCases(data ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { fetchCases() }, [fetchCases])

  useRealtime((table) => {
    if (table === 'case_logs') fetchCases()
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this case?')) return
    await supabase.from('case_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchCases()
  }

  const handleApprove = async (id: string) => {
    if (!user) return
    await supabase.from('case_logs').update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    fetchCases()
  }

  const columns = [
    { key: 'date', label: 'Date', render: (r: CaseLog) => formatDate(r.date) },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'supervision_level', label: 'Supervision' },
    { key: 'primary_specialty', label: 'Specialty' },
  ]

  const canApprove = user?.role === 'admin' || cases.some((c) => c.supervisor_user_id === user?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ICU Cases</h1>
          <p className="text-gray-500 text-sm">{cases.length} entries</p>
        </div>
        <Link href="/logs/cases/new">
          <Button>+ Add case</Button>
        </Link>
      </div>

      <Card>
        <div className="flex gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-40">
            <Input label="From date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1 min-w-40">
            <Input label="To date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>Clear</Button>
            </div>
          )}
        </div>
        <LogTable
          data={cases}
          columns={columns}
          detailPath="/logs/cases"
          onDelete={handleDelete}
          onApprove={handleApprove}
          loading={loading}
          canApprove={canApprove}
          emptyMessage="No cases found. Add your first ICU case."
        />
      </Card>
    </div>
  )
}
