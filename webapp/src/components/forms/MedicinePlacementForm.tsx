'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { SUPERVISION_LEVELS, COBATRICE_DOMAINS } from '@/lib/data'
import { today } from '@/lib/utils'
import type { MedicinePlacementLog, Profile } from '@/types/database'

interface MedicinePlacementFormProps {
  initial?: Partial<MedicinePlacementLog>
  onSuccess: () => void
}

export function MedicinePlacementForm({ initial, onSuccess }: MedicinePlacementFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    start_date: initial?.start_date ?? today(),
    end_date: initial?.end_date ?? '',
    specialty: initial?.specialty ?? '',
    hospital: initial?.hospital ?? '',
    ward: initial?.ward ?? '',
    patient_count: initial?.patient_count?.toString() ?? '',
    teaching_delivered: initial?.teaching_delivered?.toString() ?? '',
    teaching_recipient: initial?.teaching_recipient ?? '',
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

    const payload = {
      start_date: form.start_date,
      end_date: form.end_date || null,
      specialty: form.specialty || null,
      hospital: form.hospital || null,
      ward: form.ward || null,
      patient_count: form.patient_count ? parseInt(form.patient_count) : null,
      teaching_delivered: form.teaching_delivered === 'true' ? true : form.teaching_delivered === 'false' ? false : null,
      teaching_recipient: form.teaching_recipient || null,
      cobatrice_domains: form.cobatrice_domains,
      reflection: form.reflection || null,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('medicine_placement_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('medicine_placement_logs').insert({ ...payload, owner_id: user.id })
    }
    if (result.error) { setError(result.error.message); setLoading(false); return }
    onSuccess()
  }

  const boolOpts = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Start date" type="date" value={form.start_date} onChange={set('start_date')} required />
        <Input label="End date" type="date" value={form.end_date} onChange={set('end_date')} />
        <Input label="Specialty" value={form.specialty} onChange={set('specialty')} placeholder="e.g. Cardiology" />
        <Input label="Hospital" value={form.hospital} onChange={set('hospital')} placeholder="Hospital name" />
        <Input label="Ward" value={form.ward} onChange={set('ward')} placeholder="Ward name" />
        <Input label="Patient count" type="number" value={form.patient_count} onChange={set('patient_count')} min="0" />
        <Select label="Teaching delivered" options={boolOpts} value={form.teaching_delivered} onChange={set('teaching_delivered')} placeholder="Select" />
        <Input label="Teaching recipient" value={form.teaching_recipient} onChange={set('teaching_recipient')} placeholder="e.g. Medical student" />
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
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add placement'}</Button>
      </div>
    </form>
  )
}
