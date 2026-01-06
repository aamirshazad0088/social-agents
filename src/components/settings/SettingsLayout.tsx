'use client'

import React, { useState } from 'react'
import { Users, Settings, Activity, ChevronLeft, Zap } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

type Tab = 'members' | 'workspace' | 'activity' | 'accounts'

interface SettingsLayoutProps {
  children: React.ReactNode
  activeTab: Tab
}

const ADMIN_TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: 'accounts',
    label: 'Connected Accounts',
    icon: <Zap size={20} />,
  },
  {
    id: 'workspace',
    label: 'Workspace Settings',
    icon: <Settings size={20} />,
  },
]

const COMMON_TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: 'members',
    label: 'Members',
    icon: <Users size={20} />,
  },
  {
    id: 'activity',
    label: 'Activity Log',
    icon: <Activity size={20} />,
  },
]

export default function SettingsLayout({ children, activeTab }: SettingsLayoutProps) {
  const { userRole } = useAuth()

  // Show admin tabs only to admins
  const visibleTabs = userRole === 'admin' ? [...ADMIN_TABS, ...COMMON_TABS] : COMMON_TABS

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Matching Library Page Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-emerald-500/15 dark:from-teal-900 dark:via-cyan-900 dark:to-teal-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s', animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-teal-600/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
          <div className="absolute top-10 right-1/4 w-32 h-32 bg-cyan-400/25 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
          <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-teal-400/25 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/20 border border-white/30 text-teal-700 dark:text-white hover:bg-white/30 transition-all shadow-sm"
              title="Back to Dashboard"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 rounded-xl blur-lg opacity-75 animate-pulse group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 rounded-xl blur-xl opacity-50 animate-pulse"
                style={{ animationDelay: '0.5s' }} />
              <div className="relative bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 p-3 rounded-xl shadow-xl transform transition-transform group-hover:scale-105">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-lg font-bold text-teal-900 dark:text-white flex items-center gap-3">
                Workspace Settings
                <span className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-[11px] px-2 py-0.5 h-6 shadow-lg rounded-full inline-flex items-center">
                  <Zap className="w-3 h-3 mr-1 animate-pulse" />
                  Admin
                </span>
              </h1>
              <p className="text-teal-700 dark:text-white/80 text-[13px] mt-0.5">
                Manage your workspace, members, and activity
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl ml-0 pl-2 pr-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1.5 sticky top-8 max-w-[240px]">
              {visibleTabs.map(tab => (
                <Link
                  key={tab.id}
                  href={`/settings?tab=${tab.id}`}
                  className={`flex items-center gap-2 px-2 py-2 rounded-xl font-medium transition-all ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20'
                    : 'text-foreground hover:bg-muted/80 hover:text-teal-600'
                    }`}
                >
                  {tab.icon}
                  <span className={activeTab === tab.id ? 'font-semibold' : ''}>{tab.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-lg shadow-black/5">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
