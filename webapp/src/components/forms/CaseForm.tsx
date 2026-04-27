'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, TextArea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ICD10Autocomplete } from '@/components/ICD10Autocomplete'
import {
  SUPERVISION_LEVELS, ORGAN_SYSTEMS, COBATRICE_DOMAINS,
  PATIENT_SEX_OPTIONS, LEVEL_OF_CARE_OPTIONS, OUTCOME_OPTIONS, INVOLVEMENT_OPTIONS,
} from '@/lib/data'
import { today } from '@/lib/utils'
import type { CaseLog, Profile } from '@/types/database'

interface CaseFormProps {
  initial?: Partial<CaseLog>
  onSuccess: () => void
}

export function CaseForm({ initial, onSuccess }: CaseFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    date: initial?.date ?? today(),
    diagnosis: initial?.diagnosis ?? '',
    icd10_code: initial?.icd10_code ?? '',
    organ_systems: initial?.organ_systems ?? [],
    cobatrice_domains: initial?.cobatrice_domains ?? [],
    supervision_level: initial?.supervision_level ?? '',
    supervisor_user_id: initial?.supervisor_user_id ?? '',
    external_supervisor_name: initial?.external_supervisor_name ?? '',
    reflection: initial?.reflection ?? '',
    patient_age: initial?.patient_age?.toString() ?? '',
    patient_sex: initial?.patient_sex ?? '',
    case_number: initial?.case_number ?? '',
    primary_specialty: initial?.primary_specialty ?? '',
    level_of_care: initial?.level_of_care ?? '',
    admitted: initial?.admitted ?? false,
    cardiac_arrest: initial?.cardiac_arrest ?? false,
    involvement: initial?.involvement ?? '',
    outcome: initial?.outcome ?? '',
    communicated_with_relatives: initial?.communicated_with_relatives?.toString() ?? '',
    teaching_delivered: initial?.teaching_delivered?.toString() ?? '',
    teaching_recipient: initial?.teaching_recipient ?? '',
    notes: initial?.notes ?? '',
  })

  useEffect(() => {
    supabase.from('profiles').select('id, display_name, email').then(({ data }) => {
      if (data) setSupervisors(data as Profile[])
    })
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const toggle = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const payload = {
      date: form.date,
      diagnosis: form.diagnosis,
      icd10_code: form.icd10_code || null,
      organ_systems: form.organ_systems,
      cobatrice_domains: form.cobatrice_domains,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
      reflection: form.reflection || null,
      patient_age: form.patient_age ? parseInt(form.patient_age) : null,
      patient_sex: form.patient_sex || null,
      case_number: form.case_number || null,
      primary_specialty: form.primary_specialty || null,
      level_of_care: form.level_of_care || null,
      admitted: form.admitted,
      cardiac_arrest: form.cardiac_arrest,
      involvement: form.involvement || null,
      outcome: form.outcome || null,
      communicated_with_relatives: form.communicated_with_relatives === 'true' ? true : form.communicated_with_relatives === 'false' ? false : null,
      teaching_delivered: form.teaching_delivered === 'true' ? true : form.teaching_delivered === 'false' ? false : null,
      teaching_recipient: form.teaching_recipient || null,
      notes: form.notes || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('case_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('case_logs').insert({ ...payload, owner_id: user.id })
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    onSuccess()
  }

  const boolOpts = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
        <Input label="Case number" value={form.case_number} onChange={set('case_number')} placeholder="Optional" />
        <div className="md:col-span-2">
          <Input label="Diagnosis" value={form.diagnosis} onChange={set('diagnosis')} placeholder="Primary diagnosis" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">ICD-10 code</label>
          <ICD10Autocomplete
            value={form.icd10_code}
            onChange={(code) => setForm((f) => ({ ...f, icd10_code: code }))}
          />
        </div>
        <Input label="Primary specialty" value={form.primary_specialty} onChange={set('primary_specialty')} placeholder="e.g. Respiratory" />
        <Select label="Patient sex" options={PATIENT_SEX_OPTIONS} value={form.patient_sex} onChange={set('patient_sex')} placeholder="Select" />
        <Input label="Patient age" type="number" value={form.patient_age} onChange={set('patient_age')} placeholder="Years" min="0" max="120" />
        <Select label="Level of care" options={LEVEL_OF_CARE_OPTIONS} value={form.level_of_care} onChange={set('level_of_care')} placeholder="Select" />
        <Select label="Involvement" options={INVOLVEMENT_OPTIONS} value={form.involvement} onChange={set('involvement')} placeholder="Select" />
        <div className="flex items-center gap-3">
          <input
            id="admitted"
            type="checkbox"
            checked={form.admitted}
            onChange={toggle('admitted')}
            className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
          />
          <label htmlFor="admitted" className="text-sm font-medium text-gray-700">Patient admitted to ICU/HDU</label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="cardiac_arrest"
            type="checkbox"
            checked={form.cardiac_arrest}
            onChange={toggle('cardiac_arrest')}
            className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
          />
          <label htmlFor="cardiac_arrest" className="text-sm font-medium text-gray-700">Cardiac arrest</label>
        </div>
        <Select label="Communicated with relatives" options={boolOpts} value={form.communicated_with_relatives} onChange={set('communicated_with_relatives')} placeholder="Select" />
        <Select label="Teaching delivered" options={boolOpts} value={form.teaching_delivered} onChange={set('teaching_delivered')} placeholder="Select" />
        <Input label="Teaching recipient" value={form.teaching_recipient} onChange={set('teaching_recipient')} placeholder="Optional" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Supervision level" options={SUPERVISION_LEVELS} value={form.supervision_level} onChange={set('supervision_level')} placeholder="Select" />
        <Select
          label="Supervisor"
          options={supervisors.map((s) => ({ value: s.id, label: s.display_name ?? s.email }))}
          value={form.supervisor_user_id}
          onChange={set('supervisor_user_id')}
          placeholder="Select supervisor"
        />
        <Input label="External supervisor name" value={form.external_supervisor_name} onChange={set('external_supervisor_name')} placeholder="If not in system" />
      </div>

      <MultiSelect
        label="Organ systems"
        options={ORGAN_SYSTEMS}
        value={form.organ_systems}
        onChange={(v) => setForm((f) => ({ ...f, organ_systems: v }))}
      />

      <MultiSelect
        label="COBATRICE domains"
        options={COBATRICE_DOMAINS}
        value={form.cobatrice_domains}
        onChange={(v) => setForm((f) => ({ ...f, cobatrice_domains: v }))}
      />

      <Select label="Outcome" options={OUTCOME_OPTIONS} value={form.outcome} onChange={set('outcome')} placeholder="Select" />

      <TextArea
        label="Notes / Remarks"
        value={form.notes}
        onChange={set('notes')}
        placeholder="Any additional notes or remarks…"
        rows={3}
      />

      <TextArea
        label="Reflection"
        value={form.reflection}
        onChange={set('reflection')}
        placeholder="Reflect on this case…"
        rows={4}
      />

      <div className="flex gap-3 justify-end">
        <Button type="submit" loading={loading}>
          {initial?.id ? 'Save changes' : 'Add case'}
        </Button>
      </div>
    </form>
  )
}
