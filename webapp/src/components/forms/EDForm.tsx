'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { SUPERVISION_LEVELS, COBATRICE_DOMAINS, PATIENT_SEX_OPTIONS, PRESENTING_CATEGORIES } from '@/lib/data'
import { today } from '@/lib/utils'
import type { EDAttendanceLog, Profile } from '@/types/database'

interface EDFormProps {
  initial?: Partial<EDAttendanceLog>
  onSuccess: () => void
}

export function EDForm({ initial, onSuccess }: EDFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    date: initial?.date ?? today(),
    patient_age: initial?.patient_age?.toString() ?? '',
    patient_sex: initial?.patient_sex ?? '',
    diagnosis: initial?.diagnosis ?? '',
    icd10_code: initial?.icd10_code ?? '',
    icu_admission: initial?.icu_admission?.toString() ?? '',
    presenting_category: initial?.presenting_category ?? '',
    cardiac_arrest: initial?.cardiac_arrest?.toString() ?? '',
    communicated_with_relatives: initial?.communicated_with_relatives?.toString() ?? '',
    cobatrice_domains: initial?.cobatrice_domains ?? [],
    reflection: initial?.reflection ?? '',
    supervision_level: initial?.supervision_level ?? '',
    supervisor_user_id: initial?.supervisor_user_id ?? '',
    external_supervisor_name: initial?.external_supervisor_name ?? '',
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
      patient_age: form.patient_age ? parseInt(form.patient_age) : null,
      patient_sex: form.patient_sex || null,
      diagnosis: form.diagnosis || null,
      icd10_code: form.icd10_code || null,
      icu_admission: b(form.icu_admission),
      presenting_category: form.presenting_category || null,
      cardiac_arrest: b(form.cardiac_arrest),
      communicated_with_relatives: b(form.communicated_with_relatives),
      cobatrice_domains: form.cobatrice_domains,
      reflection: form.reflection || null,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('ed_attendance_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('ed_attendance_logs').insert({ ...payload, owner_id: user.id })
    }
    if (result.error) { setError(result.error.message); setLoading(false); return }
    onSuccess()
  }

  const boolOpts = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
        <Input label="Diagnosis" value={form.diagnosis} onChange={set('diagnosis')} placeholder="Primary diagnosis" />
        <Input label="ICD-10 code" value={form.icd10_code} onChange={set('icd10_code')} placeholder="e.g. J18.0" />
        <Select label="Patient sex" options={PATIENT_SEX_OPTIONS} value={form.patient_sex} onChange={set('patient_sex')} placeholder="Select" />
        <Input label="Patient age" type="number" value={form.patient_age} onChange={set('patient_age')} min="0" max="120" />
        <Select label="Presenting category" options={PRESENTING_CATEGORIES} value={form.presenting_category} onChange={set('presenting_category')} placeholder="Select" />
        <Select label="ICU admission" options={boolOpts} value={form.icu_admission} onChange={set('icu_admission')} placeholder="Select" />
        <Select label="Cardiac arrest" options={boolOpts} value={form.cardiac_arrest} onChange={set('cardiac_arrest')} placeholder="Select" />
        <Select label="Communicated with relatives" options={boolOpts} value={form.communicated_with_relatives} onChange={set('communicated_with_relatives')} placeholder="Select" />
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
      <MultiSelect label="COBATRICE domains" options={COBATRICE_DOMAINS} value={form.cobatrice_domains} onChange={(v) => setForm((f) => ({ ...f, cobatrice_domains: v }))} />
      <TextArea label="Reflection" value={form.reflection} onChange={set('reflection')} rows={4} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add ED attendance'}</Button>
      </div>
    </form>
  )
}
