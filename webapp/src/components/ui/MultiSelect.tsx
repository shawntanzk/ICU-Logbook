'use client'
import React from 'react'
import { classNames } from '@/lib/utils'

interface MultiSelectProps {
  label?: string
  options: readonly string[]
  value: string[]
  onChange: (val: string[]) => void
  error?: string
}

export function MultiSelect({ label, options, value, onChange, error }: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={classNames(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              value.includes(opt)
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
