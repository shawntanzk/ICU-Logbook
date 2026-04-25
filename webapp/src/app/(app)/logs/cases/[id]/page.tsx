'use client'
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ApprovalBadge } from '@/components/logs/ApprovalBadge'
import { CaseForm } from '@/components/forms/CaseForm'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import type { CaseLog } from '@/types/database'

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const user = useAppStore((s) => s.user)
  const [caseLog, setCaseLog] = useState<CaseLog | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  const fetchCase = async () => {
    const { data } = await supabase.from('case_logs').select('*').eq('id', id).single()
    setCaseLog(data)
    setLoading(false)
  }

  useEffect(() => { fetchCase() }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this case?')) return
    await supabase.from('case_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    router.push('/logs/cases')
  }

  const handleApprove = async () => {
    if (!user) return
    await supabase.from('case_logs').update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    fetchCase()
  }

  const canApprove = user?.role === 'admin' || caseLog?.supervisor_user_id === user?.id

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full" /></div>
  }

  if (!caseLog) {
    return <div className="text-center py-12 text-gray-500">Case not found.</div>
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="text-sm text-primary-700 hover:underline">← Back to detail</button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit case</h1>
        </div>
        <Card>
          <CaseForm initial={caseLog} onSuccess={() => { setEditing(false); fetchCase() }} />
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/logs/cases" className="text-sm text-primary-700 hover:underline">← Back to cases</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{caseLog.diagnosis}</h1>
          <p className="text-gray-500 text-sm">{formatDate(caseLog.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ApprovalBadge approvedAt={caseLog.approved_at} />
          {canApprove && !caseLog.approved_at && (
            <Button size="sm" variant="secondary" onClick={handleApprove}>Approve</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['Date', formatDate(caseLog.date)],
            ['Case number', caseLog.case_number],
            ['ICD-10', caseLog.icd10_code],
            ['Primary specialty', caseLog.primary_specialty],
            ['Patient age', caseLog.patient_age],
            ['Patient sex', caseLog.patient_sex],
            ['Level of care', caseLog.level_of_care],
            ['Supervision', caseLog.supervision_level],
            ['Admitted', caseLog.admitted !== null ? (caseLog.admitted ? 'Yes' : 'No') : '—'],
            ['Cardiac arrest', caseLog.cardiac_arrest !== null ? (caseLog.cardiac_arrest ? 'Yes' : 'No') : '—'],
            ['Involvement', caseLog.involvement],
            ['Outcome', caseLog.outcome],
            ['Communicated with relatives', caseLog.communicated_with_relatives !== null ? (caseLog.communicated_with_relatives ? 'Yes' : 'No') : '—'],
            ['Teaching delivered', caseLog.teaching_delivered !== null ? (caseLog.teaching_delivered ? 'Yes' : 'No') : '—'],
            ['Teaching recipient', caseLog.teaching_recipient],
            ['Created', formatDateTime(caseLog.created_at)],
            ['Approved at', caseLog.approved_at ? formatDateTime(caseLog.approved_at) : 'Not approved'],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {(caseLog.organ_systems?.length > 0 || caseLog.cobatrice_domains?.length > 0) && (
        <Card>
          {caseLog.organ_systems?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Organ systems</h3>
              <div className="flex flex-wrap gap-2">
                {caseLog.organ_systems.map((s) => (
                  <span key={s} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          {caseLog.cobatrice_domains?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">COBATRICE domains</h3>
              <div className="flex flex-wrap gap-2">
                {caseLog.cobatrice_domains.map((d) => (
                  <span key={d} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{d}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {caseLog.reflection && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Reflection</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseLog.reflection}</p>
        </Card>
      )}
    </div>
  )
}
