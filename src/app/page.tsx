'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  // Get invite token from URL query param
  const inviteToken = searchParams.get('invite')

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (inviteToken) {
          router.replace(`/invite/${inviteToken}`)
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/login' + (inviteToken ? `?invite=${inviteToken}` : ''))
      }
    }
  }, [user, loading, router, inviteToken])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1729]">
      <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
    </div>
  )
}



export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f1729]">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}


