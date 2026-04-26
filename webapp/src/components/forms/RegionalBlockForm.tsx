'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { SUPERVISION_LEVELS, REGIONAL_BLOCK_TYPES } from '@/lib/data'
import { today } from '@/lib/utils'
import type { RegionalBlockLog, Profile } from '@/types/database'

interface RegionalBlockFormProps {
  initial?: Partial<RegionalBlockLog>
  onSuccess: () => void
}

export function RegionalBlockForm({ initial, onSuccess }: RegionalBlockFormProps) {
  const supabase = createClient()
  const [supervisors, setSupervisors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    date: initial?.date ?? today(),
    block_type: initial?.block_type ?? '',
    block_type_other: initial?.block_type_other ?? '',
    uss_guided: initial?.uss_guided?.toString() ?? '',
    catheter: initial?.catheter?.toString() ?? '',
    attempts: initial?.attempts?.toString() ?? '',
    success: initial?.success?.toString() ?? '',
    complications: initial?.complications ?? '',
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
      block_type: form.block_type || null,
      block_type_other: form.block_type === 'Other' ? form.block_type_other || null : null,
      uss_guided: b(form.uss_guided),
      catheter: b(form.catheter),
      attempts: form.attempts ? parseInt(form.attempts) : null,
      success: b(form.success),
      complications: form.complications || null,
      supervision_level: form.supervision_level || null,
      supervisor_user_id: form.supervisor_user_id || null,
      external_supervisor_name: form.external_supervisor_name || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('regional_block_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('regional_block_logs').insert({ ...payload, owner_id: user.id })
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
        <Select label="Block type" options={REGIONAL_BLOCK_TYPES} value={form.block_type} onChange={set('block_type')} placeholder="Select type" />
        {form.block_type === 'Other' && (
          <Input label="Block type (other)" value={form.block_type_other} onChange={set('block_type_other')} placeholder="Describe the block" />
        )}
        <Select label="USS guided" options={boolOpts} value={form.uss_guided} onChange={set('uss_guided')} placeholder="Select" />
        <Select label="Catheter" options={boolOpts} value={form.catheter} onChange={set('catheter')} placeholder="Select" />
        <Input label="Attempts" type="number" value={form.attempts} onChange={set('attempts')} min="1" />
        <Select label="Success" options={boolOpts} value={form.success} onChange={set('success')} placeholder="Select" />
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
      <TextArea label="Complications" value={form.complications} onChange={set('complications')} rows={3} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add regional block'}</Button>
      </div>
    </form>
  )
}
