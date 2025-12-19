'use client'

import React, { useState, useEffect } from 'react'
import type { WorkspaceMember, UserRole } from '@/types/workspace'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { MoreVertical, Trash2, UserCog, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface MemberCardProps {
  member: WorkspaceMember
  currentUserRole: UserRole
  currentUserId: string
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}

/**
 * Member Card Component
 * Displays a single workspace member with their info and admin actions
 * Admin-only actions: change role, remove member
 */
export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  currentUserRole,
  currentUserId,
  onRoleChange,
  onRemove,
}) => {
  const [showActions, setShowActions] = useState(false)
  const [isChangingRole, setIsChangingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role)
  const [isLoading, setIsLoading] = useState(false)

  // Sync selectedRole when member.role changes from parent
  useEffect(() => {
    setSelectedRole(member.role)
  }, [member.role])

  const isCurrentUser = member.id === currentUserId
  const isAdmin = currentUserRole === 'admin'
  const canManage = isAdmin && !isCurrentUser

  // Format date to readable format with time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  /**
   * Handle role change
   */
  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === member.role) {
      setIsChangingRole(false)
      return
    }

    setIsLoading(true)
    setSelectedRole(newRole)

    try {
      await onRoleChange(member.id, newRole)
      toast.success(`Role updated to ${newRole}`)
      setIsChangingRole(false)
    } catch (error) {
      toast.error('Failed to update role')
      setSelectedRole(member.role)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle remove member
   */
  const handleRemove = async () => {
    const confirmed = confirm(
      `Are you sure you want to remove ${member.full_name || member.email} from the workspace? This action cannot be undone.`
    )

    if (!confirmed) return

    setIsLoading(true)

    try {
      await onRemove(member.id)
      toast.success('Member removed successfully')
      setShowActions(false)
    } catch (error) {
      toast.error('Failed to remove member')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.full_name || member.email}
            className="w-12 h-12 rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">
            {(member.full_name || member.email).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Member Information */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">
            {member.full_name || 'No name'}
          </h3>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              You
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Joined {formatDate(member.created_at)}
        </p>
      </div>

      {/* Role Display/Selector */}
      <div className="flex-shrink-0">
        {isChangingRole && !isLoading ? (
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            onBlur={() => {
              setIsChangingRole(false)
              setSelectedRole(member.role)
            }}
            autoFocus
            className="border border-border rounded-md px-2 py-1 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>

      {/* Admin Actions Menu */}
      {canManage && (
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setShowActions(!showActions)}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Member actions"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>

          {showActions && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActions(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-border py-1 z-20">
                <button
                  onClick={() => {
                    setIsChangingRole(true)
                    setShowActions(false)
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-foreground disabled:opacity-50"
                >
                  <UserCog className="w-4 h-4" />
                  Change Role
                </button>

                <button
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove Member
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MemberCard
