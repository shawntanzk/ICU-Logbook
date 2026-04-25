'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { SUPERVISION_LEVELS, AIRWAY_DEVICES } from '@/lib/data'
import { today } from '@/lib/utils'
import type { AirwayLog, Profile } from '@/types/database'

const DAE_ITEMS_OPTIONS = ['Gum elastic bougie', 'Stylet', 'Video laryngoscope', 'Airway exchange catheter', 'Supraglottic airway', 'Other']
const CL_GRADES = ['I', 'II', 'IIa', 'IIb', 'III', 'IV']

interface AirwayFormProps {
  initial?: Partial<AirwayLog>
  onSuccess: () => void
}

export function AirwayForm({ initial, onSuccess }: AirwayFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    date: initial?.date ?? today(),
    is_rsi: initial?.is_rsi?.toString() ?? '',
    induction_agent: initial?.induction_agent ?? '',
    neuromuscular_agent: initial?.neuromuscular_agent ?? '',
    device: initial?.device ?? '',
    tube_size: initial?.tube_size ?? '',
    tube_type: initial?.tube_type ?? '',
    attempts: initial?.attempts?.toString() ?? '',
    success: initial?.success?.toString() ?? '',
    cormack_lehane_grade: initial?.cormack_lehane_grade ?? '',
    dae_used: initial?.dae_used?.toString() ?? '',
    dae_items: initial?.dae_items ?? [],
    supervision_level: initial?.supervision_level ?? '',
    supervisor_user_id: initial?.supervisor_user_id ?? '',
    external_supervisor_name: initial?.external_supervisor_name ?? '',
    notes: initial?.notes ?? '',
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
      is_rsi: form.is_rsi === 'true' ? true : form.is_rsi === 'false' ? false : null,
      induction_agent: form.induction_agent || null,
      neuromuscular_agent: form.neuromuscular_agent || null,
      device: form.device || null,
      tube_size: form.tube_size || null,
      tube_type: form.tube_type || null,
      attempts: form.attempts ? parseInt(form.attempts) : null,
      success: form.success === 'true' ? true : form.success === 'false' ? false : null,
      cormack_lehane_grade: form.cormack_lehane_grade || null,
      dae_used: form.dae_used === 'true' ? true : form.dae_used === 'false' ? false : null,
      dae_items: form.dae_items,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
      notes: form.notes || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('airway_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('airway_logs').insert({ ...payload, owner_id: user.id })
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
        <Select label="RSI" options={boolOpts} value={form.is_rsi} onChange={set('is_rsi')} placeholder="Select" />
        <Input label="Induction agent" value={form.induction_agent} onChange={set('induction_agent')} placeholder="e.g. Propofol" />
        <Input label="Neuromuscular agent" value={form.neuromuscular_agent} onChange={set('neuromuscular_agent')} placeholder="e.g. Rocuronium" />
        <Select label="Device" options={AIRWAY_DEVICES} value={form.device} onChange={set('device')} placeholder="Select device" />
        <Input label="Tube size" value={form.tube_size} onChange={set('tube_size')} placeholder="e.g. 7.5" />
        <Input label="Tube type" value={form.tube_type} onChange={set('tube_type')} placeholder="e.g. Cuffed, PVC" />
        <Input label="Attempts" type="number" value={form.attempts} onChange={set('attempts')} min="1" />
        <Select label="Success" options={boolOpts} value={form.success} onChange={set('success')} placeholder="Select" />
        <Select label="Cormack-Lehane grade" options={CL_GRADES} value={form.cormack_lehane_grade} onChange={set('cormack_lehane_grade')} placeholder="Select grade" />
        <Select label="DAE used" options={boolOpts} value={form.dae_used} onChange={set('dae_used')} placeholder="Select" />
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
      <MultiSelect label="DAE items used" options={DAE_ITEMS_OPTIONS} value={form.dae_items} onChange={(v) => setForm((f) => ({ ...f, dae_items: v }))} />
      <TextArea label="Notes" value={form.notes} onChange={set('notes')} rows={3} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add airway log'}</Button>
      </div>
    </form>
  )
}
