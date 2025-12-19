'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { UserPlus, UserMinus, Shield, Settings, LogOut, Trash2, RefreshCw, Send, Calendar, FileText, Filter, Users } from 'lucide-react'

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, any>
  created_at: string
  user_id: string
  user_email: string
  user_name: string | null
}

interface WorkspaceMember {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'editor' | 'viewer'
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  member_invited: <UserPlus size={16} className="text-primary" />,
  member_joined: <UserPlus size={16} className="text-accent" />,
  member_removed: <UserMinus size={16} className="text-destructive" />,
  member_role_changed: <Shield size={16} className="text-primary" />,
  workspace_updated: <Settings size={16} className="text-primary" />,
  invite_revoked: <Trash2 size={16} className="text-destructive" />,
  // Content actions (new format)
  post_published: <Send size={16} className="text-green-500" />,
  post_scheduled: <Calendar size={16} className="text-blue-500" />,
  post_deleted: <Trash2 size={16} className="text-red-500" />,
  // Content actions (legacy format from posts API)
  delete: <Trash2 size={16} className="text-red-500" />,
  update: <Settings size={16} className="text-blue-500" />,
  create: <FileText size={16} className="text-green-500" />,
}

const ACTION_LABELS: Record<string, string> = {
  member_invited: 'Member Invited',
  member_joined: 'Member Joined',
  member_removed: 'Member Removed',
  member_role_changed: 'Role Changed',
  workspace_updated: 'Workspace Updated',
  invite_revoked: 'Invite Revoked',
  // Content actions (new format)
  post_published: 'Post Published',
  post_scheduled: 'Post Scheduled',
  post_deleted: 'Post Deleted',
  // Content actions (legacy format from posts API)
  delete: 'Post Deleted',
  update: 'Post Updated',
  create: 'Post Created',
}

export default function ActivityLogTab() {
  const { workspaceId, userRole } = useAuth()
  const { addNotification } = useNotifications()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const isAdmin = userRole === 'admin'

  const LIMIT = 20

  // Load workspace members
  useEffect(() => {
    if (!workspaceId || !isAdmin) return

    const loadMembers = async () => {
      try {
        const res = await fetch('/api/workspace/members')
        if (res.ok) {
          const result = await res.json()
          // API returns { data: members[] }
          setMembers(result.data || [])
        }
      } catch (error) {
      }
    }

    loadMembers()
  }, [workspaceId, isAdmin])

  // Load activity logs
  useEffect(() => {
    if (!workspaceId || !isAdmin) return

    const loadActivities = async () => {
      try {
        setLoading(true)
        let url = `/api/workspace/activity?limit=${LIMIT}&offset=${page * LIMIT}`
        if (selectedMember !== 'all') {
          url += `&userId=${selectedMember}`
        }
        if (selectedAction !== 'all') {
          url += `&action=${selectedAction}`
        }
        const res = await fetch(url)
        if (res.ok) {
          const result = await res.json()
          setActivities(result.data as ActivityLog[])
          setHasMore(result.hasMore)
        }
      } catch (error) {
        addNotification('error', 'Load Failed', 'Failed to load activity log')
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [workspaceId, isAdmin, page, selectedMember, selectedAction, refreshKey, addNotification])

  const handleRefresh = () => {
    setPage(0)
    setRefreshKey(k => k + 1)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity log entry?')) {
      return
    }

    try {
      const res = await fetch(`/api/workspace/activity/${activityId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== activityId))
        addNotification('success', 'Deleted', 'Activity log entry deleted')
      } else {
        const data = await res.json()
        addNotification('error', 'Delete Failed', data.error || 'Failed to delete activity log')
      }
    } catch (error) {
      addNotification('error', 'Delete Failed', 'Failed to delete activity log')
    }
  }

  const handleMemberChange = (memberId: string) => {
    setSelectedMember(memberId)
    setPage(0)
  }

  const handleActionChange = (action: string) => {
    setSelectedAction(action)
    setPage(0)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionDescription = (activity: ActivityLog): string => {
    const { action, details, user_name, user_email } = activity
    const userName = user_name || user_email || 'Unknown'

    switch (action) {
      // Team actions
      case 'member_invited':
        return `${userName} invited ${details.invite_email || 'someone'} as ${details.invite_role}`
      case 'member_joined':
        return `${userName} joined as ${details.role}`
      case 'member_removed':
        return `${userName} removed ${details.removed_user_email}`
      case 'member_role_changed':
        return `${userName} changed ${details.target_user_email}'s role from ${details.old_role} to ${details.new_role}`
      case 'workspace_updated':
        return `${userName} updated workspace settings`
      case 'invite_revoked':
        return `${userName} revoked an invitation for ${details.invite_email || 'shareable link'}`
      // Content actions (new format)
      case 'post_published':
        const platforms = details.platforms?.join(', ') || 'platforms'
        return `${userName} published "${details.post_title || 'a post'}" to ${platforms}`
      case 'post_scheduled':
        const scheduleDate = details.scheduled_at ? new Date(details.scheduled_at).toLocaleDateString() : 'a date'
        return `${userName} scheduled "${details.post_title || 'a post'}" for ${scheduleDate}`
      case 'post_deleted':
        return `${userName} deleted "${details.post_title || 'a post'}"`
      // Legacy actions from posts API
      case 'delete':
        return `${userName} deleted a post`
      case 'update':
        return `${userName} updated a post`
      case 'create':
        return `${userName} created a post`
      default:
        return `${userName} performed action: ${action}`
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-muted border border-border rounded-lg">
        <h3 className="font-semibold text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground">Activity logs are only available to workspace admins.</p>
      </div>
    )
  }

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading activity log...</div>
      </div>
    )
  }

  // Get role badge color
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/50 p-4 rounded-lg border border-border">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Member Filter */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <select
              value={selectedMember}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Members</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.email} ({member.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Actions</option>
              <optgroup label="Content">
                <option value="post_published">Published</option>
                <option value="post_scheduled">Scheduled</option>
                <option value="post_deleted">Deleted</option>
              </optgroup>
              <optgroup label="Team">
                <option value="member_invited">Invited</option>
                <option value="member_joined">Joined</option>
                <option value="member_removed">Removed</option>
                <option value="member_role_changed">Role Changed</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Member Stats */}
      {selectedMember === 'all' && members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {members.map((member) => {
            const memberActivities = activities.filter(a => a.user_id === member.id).length
            return (
              <button
                key={member.id}
                onClick={() => handleMemberChange(member.id)}
                className="p-3 bg-card border border-border rounded-lg hover:border-primary transition-colors text-left"
              >
                <p className="font-medium text-foreground text-sm truncate">
                  {member.full_name || member.email.split('@')[0]}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(member.role)}`}>
                    {member.role}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {memberActivities} activities
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors"
            >
              {/* Icon */}
              <div className="pt-1">
                {ACTION_ICONS[activity.action] || <RefreshCw size={16} className="text-muted-foreground" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground">
                    {ACTION_LABELS[activity.action] || activity.action}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getActionDescription(activity)}
                </p>
                {Object.keys(activity.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Details
                    </summary>
                    <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto text-foreground">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Date and Delete */}
              <div className="text-right flex-shrink-0 flex items-center gap-2">
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(activity.created_at)}
                </p>
                <button
                  onClick={() => handleDeleteActivity(activity.id)}
                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Delete activity log"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasMore || page > 0 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Previous
          </button>

          <span className="text-sm text-muted-foreground">
            Page {page + 1}
          </span>

          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
