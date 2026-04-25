'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { SUPERVISION_LEVELS, PATIENT_SEX_OPTIONS, LEVEL_OF_CARE_OPTIONS, TRANSFER_TYPES, TRANSFER_MODES, PROCEDURE_TYPES } from '@/lib/data'
import { today } from '@/lib/utils'
import type { TransferLog, Profile } from '@/types/database'

interface TransferFormProps {
  initial?: Partial<TransferLog>
  onSuccess: () => void
}

export function TransferForm({ initial, onSuccess }: TransferFormProps) {
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
    transfer_type: initial?.transfer_type ?? '',
    transfer_mode: initial?.transfer_mode ?? '',
    from_location: initial?.from_location ?? '',
    to_location: initial?.to_location ?? '',
    level_of_care: initial?.level_of_care ?? '',
    procedures_during_transfer: initial?.procedures_during_transfer ?? [],
    communicated_with_relatives: initial?.communicated_with_relatives?.toString() ?? '',
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

    const payload = {
      date: form.date,
      patient_age: form.patient_age ? parseInt(form.patient_age) : null,
      patient_sex: form.patient_sex || null,
      diagnosis: form.diagnosis || null,
      icd10_code: form.icd10_code || null,
      transfer_type: form.transfer_type || null,
      transfer_mode: form.transfer_mode || null,
      from_location: form.from_location || null,
      to_location: form.to_location || null,
      level_of_care: form.level_of_care || null,
      procedures_during_transfer: form.procedures_during_transfer,
      communicated_with_relatives: form.communicated_with_relatives === 'true' ? true : form.communicated_with_relatives === 'false' ? false : null,
      reflection: form.reflection || null,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('transfer_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('transfer_logs').insert({ ...payload, owner_id: user.id })
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
        <Select label="Transfer type" options={TRANSFER_TYPES} value={form.transfer_type} onChange={set('transfer_type')} placeholder="Select" />
        <Select label="Transfer mode" options={TRANSFER_MODES} value={form.transfer_mode} onChange={set('transfer_mode')} placeholder="Select" />
        <Input label="From location" value={form.from_location} onChange={set('from_location')} placeholder="e.g. ICU Ward 4" />
        <Input label="To location" value={form.to_location} onChange={set('to_location')} placeholder="e.g. Receiving hospital ICU" />
        <Select label="Level of care" options={LEVEL_OF_CARE_OPTIONS} value={form.level_of_care} onChange={set('level_of_care')} placeholder="Select" />
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
      <MultiSelect label="Procedures during transfer" options={PROCEDURE_TYPES} value={form.procedures_during_transfer} onChange={(v) => setForm((f) => ({ ...f, procedures_during_transfer: v }))} />
      <TextArea label="Reflection" value={form.reflection} onChange={set('reflection')} rows={4} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add transfer'}</Button>
      </div>
    </form>
  )
}
