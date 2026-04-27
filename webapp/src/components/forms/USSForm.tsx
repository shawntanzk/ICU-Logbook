'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { SUPERVISION_LEVELS, USS_STUDY_TYPES } from '@/lib/data'
import { today } from '@/lib/utils'
import { CaseSelector } from '@/components/CaseSelector'
import type { USSLog, Profile } from '@/types/database'

interface USSFormProps {
  initial?: Partial<USSLog>
  onSuccess: () => void
}

export function USSForm({ initial, onSuccess }: USSFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    date: initial?.date ?? today(),
    study_type: initial?.study_type ?? '',
    performed: initial?.performed?.toString() ?? '',
    formal_report: initial?.formal_report?.toString() ?? '',
    findings: initial?.findings ?? '',
    supervision_level: initial?.supervision_level ?? '',
    supervisor_user_id: initial?.supervisor_user_id ?? '',
    external_supervisor_name: initial?.external_supervisor_name ?? '',
    case_id: initial?.case_id ?? '',
  })

  useEffect(() => {
    supabase.from('profiles').select('id, display_name, email').then(({ data }) => {
      if (data) setSupervisors(data as Profile[])
    })
  }, [])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const b = (v: string) => v === 'true' ? true : v === 'false' ? false : null
    const payload = {
      date: form.date,
      study_type: form.study_type || null,
      performed: b(form.performed),
      formal_report: b(form.formal_report),
      findings: form.findings || null,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
      case_id: form.case_id || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('uss_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('uss_logs').insert({ ...payload, owner_id: user.id })
    }
    if (result.error) { setError(result.error.message); setLoading(false); return }
    onSuccess()
  }

  const boolOpts = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <CaseSelector value={form.case_id} onChange={(id) => setForm((f) => ({ ...f, case_id: id }))} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
        <Select label="Study type" options={USS_STUDY_TYPES} value={form.study_type} onChange={set('study_type')} placeholder="Select type" />
        <Select label="Performed" options={boolOpts} value={form.performed} onChange={set('performed')} placeholder="Select" />
        <Select label="Formal report" options={boolOpts} value={form.formal_report} onChange={set('formal_report')} placeholder="Select" />
        <Select label="Supervision level" options={SUPERVISION_LEVELS} value={form.supervision_level} onChange={set('supervision_level')} placeholder="Select" />
        <Select
          label="Supervisor"
          options={supervisors.map((s) => ({ value: s.id, label: s.display_name ?? s.email }))}
          value={form.supervisor_user_id}
          onChange={set('supervisor_user_id')}
          placeholder="Select supervisor"
        />
        <Input label="External supervisor" value={form.external_supervisor_name} onChange={set('external_supervisor_name')} placeholder="If not in system" />
      </div>
      <TextArea label="Findings" value={form.findings} onChange={set('findings')} rows={4} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add USS log'}</Button>
      </div>
    </form>
  )
}
