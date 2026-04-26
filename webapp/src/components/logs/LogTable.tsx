'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ApprovalBadge } from './ApprovalBadge'
import { formatDate, truncate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export interface LogTableColumn<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface LogTableProps<T extends { id: string; approved_at?: string | null; date?: string; created_at?: string }> {
  data: T[]
  columns: LogTableColumn<T>[]
  detailPath?: string
  onDelete?: (id: string) => void
  onApprove?: (id: string) => void
  loading?: boolean
  emptyMessage?: string
  canApprove?: boolean
}

export function LogTable<T extends { id: string; approved_at?: string | null; date?: string; created_at?: string }>({
  data,
  columns,
  detailPath,
  onDelete,
  onApprove,
  loading,
  emptyMessage = 'No entries yet.',
  canApprove,
}: LogTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortKey]
    const bv = (b as Record<string, unknown>)[sortKey]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (sorted.length === 0) {
    return <p className="text-center text-gray-500 py-12">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                onClick={() => col.sortable !== false && handleSort(String(col.key))}
              >
                {col.label}
                {sortKey === String(col.key) && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            {(detailPath || onDelete || onApprove) && (
              <th className="px-4 py-3" />
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-gray-700">
                  {col.render
                    ? col.render(row)
                    : truncate(String((row as Record<string, unknown>)[String(col.key)] ?? ''), 40)}
                </td>
              ))}
              <td className="px-4 py-3">
                <ApprovalBadge approvedAt={row.approved_at} />
              </td>
              {(detailPath || onDelete || onApprove) && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {detailPath && (
                      <Link
                        href={`${detailPath}/${row.id}`}
                        className="text-primary-700 hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    )}
                    {canApprove && onApprove && !row.approved_at && (
                      <Button size="sm" variant="secondary" onClick={() => onApprove(row.id)}>
                        Approve
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="sm" variant="danger" onClick={() => onDelete(row.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
