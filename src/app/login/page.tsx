'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthPage from '@/components/auth/AuthPage'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, loading } = useAuth()
    const inviteToken = searchParams.get('invite')

    useEffect(() => {
        if (user && !loading) {
            if (inviteToken) {
                router.replace(`/invite/${inviteToken}`)
            } else {
                router.replace('/dashboard')
            }
        }
    }, [user, loading, router, inviteToken])

    return <AuthPage inviteToken={inviteToken} />
}


export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0f1729]">
                <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
