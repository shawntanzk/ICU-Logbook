import React from 'react'
import { Card } from './Card'

interface StatCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  color?: string
}

export function StatCard({ title, value, icon, color = 'text-primary-700' }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        {icon && <div className="text-3xl opacity-20">{icon}</div>}
      </div>
    </Card>
  )
}
