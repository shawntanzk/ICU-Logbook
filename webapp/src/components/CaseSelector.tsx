'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CaseOption {
  id: string
  label: string
}

interface Props {
  value: string
  onChange: (caseId: string) => void
}

export function CaseSelector({ value, onChange }: Props) {
  const supabase = createClient()
  const [options, setOptions] = useState<CaseOption[]>([])

  useEffect(() => {
    supabase
      .from('case_logs')
      .select('id, date, diagnosis')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setOptions(data.map((c) => ({ id: c.id, label: `${c.date} — ${c.diagnosis}` })))
        }
      })
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Link to Clinical Episode <span className="text-gray-400 font-normal">(optional)</span></label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent"
      >
        <option value="">— None —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
