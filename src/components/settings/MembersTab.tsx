'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Plus, Trash2, Shield, Edit2, Mail, Link as LinkIcon, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import type { WorkspaceMember, WorkspaceInvite } from '@/types/workspace'
import MemberCard from './MemberCard'
import InviteMemberModal from './InviteMemberModal'
import { RoleBadge } from '../ui/RoleBadge'

// Use WorkspaceInvite from types
type PendingInvite = WorkspaceInvite

export default function MembersTab() {
  const { user, workspaceId, userRole } = useAuth()
  const { addNotification } = useNotifications()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const isAdmin = userRole === 'admin'

  // Copy invite link to clipboard
  const handleCopyLink = async (invite: PendingInvite) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const inviteUrl = `${baseUrl}/invite/${invite.token}`
    
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedInviteId(invite.id)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopiedInviteId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  // Load members and pending invites
  useEffect(() => {
    if (!workspaceId) return

    const loadData = async () => {
      try {
        setLoading(true)

        // Load workspace members via API
        const membersRes = await fetch('/api/workspace/members')
        if (membersRes.ok) {
          const { data } = await membersRes.json()
          setMembers(data as WorkspaceMember[])
        }

        // Load pending invites (only if admin)
        if (isAdmin) {
          const invitesRes = await fetch('/api/workspace/invites')
          if (invitesRes.ok) {
            const { data } = await invitesRes.json()
            setPendingInvites(data as PendingInvite[])
          }
        }
      } catch (error) {
        addNotification('error', 'Load Failed', 'Failed to load workspace members')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [workspaceId, isAdmin, addNotification])

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId) return

    const confirmed = confirm('Are you sure you want to remove this member?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMembers(members.filter(m => m.id !== memberId))
        addNotification('post_published', 'Success', 'Member removed successfully')
      } else {
        addNotification('error', 'Failed', 'Failed to remove member')
      }
    } catch (error) {
      addNotification('error', 'Error', 'Error removing member')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!workspaceId) return

    try {
      const res = await fetch(`/api/workspace/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
        addNotification('post_published', 'Member role updated', 'Member role updated')
      } else {
        addNotification('error', 'Failed to update member role', 'Failed to update member role')
      }
    } catch (error) {
      addNotification('error', 'Error updating member role', 'Error updating member role')
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!workspaceId) return

    const confirmed = confirm('Are you sure you want to revoke this invitation?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/workspace/invites?inviteId=${inviteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setPendingInvites(pendingInvites.filter(i => i.id !== inviteId))
        toast.success('Invitation revoked successfully')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to revoke invitation')
      }
    } catch (error) {
      toast.error('Error revoking invitation')
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    if (!workspaceId) return

    try {
      const res = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', inviteId }),
      })

      if (res.ok) {
        addNotification('post_published', 'Invitation resent successfully', 'Invitation resent successfully')
      } else {
        addNotification('error', 'Failed to resend invitation', 'Failed to resend invitation')
      }
    } catch (error) {
      addNotification('error', 'Error resending invitation', 'Error resending invitation')
    }
  }

  const handleInviteSent = async () => {
    setIsInviteModalOpen(false)
    // Refresh pending invites
    if (isAdmin) {
      try {
        const res = await fetch('/api/workspace/invites')
        if (res.ok) {
          const { data } = await res.json()
          setPendingInvites(data as PendingInvite[])
        }
      } catch (error) {
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading members...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current Members Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Workspace Members</h2>
            <p className="text-sm text-muted-foreground mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md"
            >
              <Plus size={18} />
              Invite Member
            </button>
          )}
        </div>

        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-8 bg-muted rounded-lg border border-border">
              <p className="text-muted-foreground">No members yet</p>
            </div>
          ) : (
            members.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserRole={userRole || 'viewer'}
                currentUserId={user?.id || ''}
                onRemove={async (userId) => handleRemoveMember(userId)}
                onRoleChange={async (userId, role) => handleRoleChange(userId, role)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pending Invitations Section */}
      {isAdmin && pendingInvites.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-6">Pending Invitations</h2>
          <div className="space-y-3">
            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {invite.email ? <Mail size={20} className="text-primary" /> : <LinkIcon size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {invite.email || 'Shareable Link'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invite.email ? `Email invitation` : `Anyone with link can join`}
                    </p>
                  </div>
                  <RoleBadge role={invite.role} size="sm" />
                </div>

                <div className="flex items-center gap-2">
                  {invite.expires_at && new Date(invite.expires_at).getTime() < new Date().getTime() && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Expired</span>
                  )}
                  <button
                    onClick={() => handleCopyLink(invite)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    title="Copy invite link"
                  >
                    {copiedInviteId === invite.id ? (
                      <Check size={18} className="text-green-600" />
                    ) : (
                      <Copy size={18} className="text-blue-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    title="Resend invitation"
                  >
                    <Mail size={18} className="text-primary" />
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    title="Revoke invitation"
                  >
                    <Trash2 size={18} className="text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteCreated={handleInviteSent}
      />
    </div>
  )
}
