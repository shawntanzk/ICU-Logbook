'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'

interface AdminUser extends Profile {
  case_count?: number
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const currentUser = useAppStore((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [currentUser])

  const fetchUsers = async () => {
    const { data: profiles, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setUsers(profiles ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const edgeFn = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch('https://qbkrgjbcizpcunwmzhrq.supabase.co/functions/v1/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    })
  }

  const handleToggleRole = async (user: Profile) => {
    setActionLoading(user.id)
    setError('')
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      const res = await edgeFn({ action: 'setRole', userId: user.id, role: newRole })
      if (!res.ok) {
        const { error: err } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
        if (err) setError(err.message)
      }
    } catch {
      await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    }
    await fetchUsers()
    setActionLoading(null)
  }

  const handleToggleDisabled = async (user: Profile) => {
    setActionLoading(user.id + '-disabled')
    setError('')
    const newDisabled = !user.disabled
    const { error: err } = await supabase.from('profiles').update({ disabled: newDisabled }).eq('id', user.id)
    if (err) setError(err.message)
    await fetchUsers()
    setActionLoading(null)
  }

  const handleDelete = async (user: Profile) => {
    if (!confirm(`Delete user ${user.display_name ?? user.email}? This cannot be undone.`)) return
    setActionLoading(user.id + '-delete')
    setError('')
    try {
      const res = await edgeFn({ action: 'deleteUser', userId: user.id })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete user')
      }
    } catch {
      setError('Failed to delete user')
    }
    await fetchUsers()
    setActionLoading(null)
  }

  if (currentUser?.role !== 'admin') {
    return <div className="text-center py-12 text-gray-500">Access denied.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm">Manage users and access</p>
      </div>

      {error && <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">{error}</div>}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Users ({users.length})</h2>
          <Button size="sm" variant="secondary" onClick={fetchUsers}>Refresh</Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.display_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'blue' : 'gray'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.disabled ? 'red' : 'green'}>{u.disabled ? 'Disabled' : 'Active'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.country ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      {u.id !== currentUser?.id && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actionLoading === u.id}
                            onClick={() => handleToggleRole(u)}
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </Button>
                          <Button
                            size="sm"
                            variant={u.disabled ? 'secondary' : 'ghost'}
                            loading={actionLoading === u.id + '-disabled'}
                            onClick={() => handleToggleDisabled(u)}
                          >
                            {u.disabled ? 'Enable' : 'Disable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={actionLoading === u.id + '-delete'}
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
