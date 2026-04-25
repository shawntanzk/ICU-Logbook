import React from 'react'
import { Badge } from '@/components/ui/Badge'

interface ApprovalBadgeProps {
  approvedAt: string | null | undefined
}

export function ApprovalBadge({ approvedAt }: ApprovalBadgeProps) {
  if (approvedAt) {
    return <Badge variant="green">Approved</Badge>
  }
  return <Badge variant="yellow">Pending</Badge>
}
