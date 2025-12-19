/**
 * Hook for checking user permissions based on role
 * Roles: admin, editor, viewer
 */

import { useAuth } from '@/contexts/AuthContext'

export function usePermissions() {
  const { userRole } = useAuth()

  return {
    // Role checks
    isAdmin: userRole === 'admin',
    isEditor: userRole === 'editor',
    isViewer: userRole === 'viewer',
    
    // Permission checks
    canEdit: userRole === 'admin' || userRole === 'editor',
    canCreate: userRole === 'admin' || userRole === 'editor',
    canDelete: userRole === 'admin' || userRole === 'editor',
    canPublish: userRole === 'admin' || userRole === 'editor',
    canManageMembers: userRole === 'admin',
    canManageWorkspace: userRole === 'admin',
    
    // View-only mode - true for viewer role
    isViewOnly: userRole === 'viewer',
    
    // Current role
    role: userRole,
  }
}
