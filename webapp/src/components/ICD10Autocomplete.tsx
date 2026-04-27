'use client'
import { useMemo, useRef, useState } from 'react'
import { ICD10Entry, findByCode, searchICD10 } from '@/lib/icd10'

interface Props {
  value: string
  onChange: (code: string) => void
}

function formatEntry(entry: ICD10Entry): string {
  return `${entry.label} [${entry.code}]`
}

function stripCode(text: string): string {
  const match = text.match(/\[([^\]]+)\]\s*$/)
  return (match ? match[1] : text).trim()
}

export function ICD10Autocomplete({ value, onChange }: Props) {
  const initial = useMemo(() => {
    const entry = findByCode(value)
    return entry ? formatEntry(entry) : value
  }, [value])

  const [query, setQuery] = useState(initial)
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(() => {
    if (!open) return []
    return searchICD10(query, 20)
  }, [query, open])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setQuery(text)
    const exact = findByCode(stripCode(text))
    onChange(exact ? exact.code : '')
  }

  function handleSelect(entry: ICD10Entry) {
    setQuery(formatEntry(entry))
    onChange(entry.code)
    setOpen(false)
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setOpen(true)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search by code or diagnosis (e.g. sepsis or A41)"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {suggestions.map((item) => (
            <li
              key={item.code}
              onMouseDown={() => handleSelect(item)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              {item.label}{' '}
              <span className="font-semibold text-primary-700">[{item.code}]</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
