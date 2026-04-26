'use client'
import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, TextArea } from '@/components/ui/Input'
import { PROCEDURE_TYPES } from '@/lib/data'
import { today } from '@/lib/utils'
import type { ProcedureLog } from '@/types/database'

interface ProcedureFormProps {
  initial?: Partial<ProcedureLog>
  onSuccess: () => void
}

export function ProcedureForm({ initial, onSuccess }: ProcedureFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    procedure_type: initial?.procedure_type ?? '',
    attempts: initial?.attempts?.toString() ?? '',
    success: initial?.success?.toString() ?? '',
    complications: initial?.complications ?? '',
  })

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const payload = {
      procedure_type: form.procedure_type,
      attempts: form.attempts ? parseInt(form.attempts) : null,
      success: form.success === 'true' ? true : form.success === 'false' ? false : null,
      complications: form.complications || null,
    }

    let result
    if (initial?.id) {
      result = await supabase.from('procedure_logs').update(payload).eq('id', initial.id)
    } else {
      result = await supabase.from('procedure_logs').insert({ ...payload, owner_id: user.id })
    }

    if (result.error) { setError(result.error.message); setLoading(false); return }
    onSuccess()
  }

  const boolOpts = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      <Select label="Procedure type" options={PROCEDURE_TYPES} value={form.procedure_type} onChange={set('procedure_type')} placeholder="Select type" required />
      <Input label="Attempts" type="number" value={form.attempts} onChange={set('attempts')} placeholder="Number of attempts" min="1" />
      <Select label="Success" options={boolOpts} value={form.success} onChange={set('success')} placeholder="Select" />
      <TextArea label="Complications" value={form.complications} onChange={set('complications')} placeholder="Any complications…" rows={3} />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add procedure'}</Button>
      </div>
    </form>
  )
}
