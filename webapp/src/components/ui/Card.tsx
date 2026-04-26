import React from 'react'
import { classNames } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        'bg-white rounded-2xl shadow-sm p-6',
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
        className
      )}
    >
      {children}
    </div>
  )
}
