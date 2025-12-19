'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Sparkles, Calendar, CheckCircle2, ArrowRight, Shield, BarChart3, Rocket } from 'lucide-react'

interface AuthPageProps {
  inviteToken?: string | null
}

export default function AuthPage({ inviteToken }: AuthPageProps) {
  // Show Sign Up first if coming from invite (new users)
  const [isLogin, setIsLogin] = useState(!inviteToken)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        // Sign in
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      } else {
        // Sign up
        if (!fullName.trim()) {
          setError('Please enter your full name')
          setLoading(false)
          return
        }

        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error.message)
        } else {
          // Success message - check if email confirmation is required
          setError(null)
          setIsLogin(true)
          // Reset form
          setEmail('')
          setPassword('')
          setFullName('')
          alert('Account created successfully! Please sign in.')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0f1729] relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/LangChain.mp4" type="video/mp4" />
      </video>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10">
        <div className="flex flex-col justify-center p-12 w-full">
          {/* Logo - positioned at top */}
          <div className="absolute top-8 left-12 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Rocket className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Content OS</span>
          </div>

          {/* Main Title - positioned in center */}
          <div>
            <div className="text-8xl  text-white leading-[1.1] tracking-tight">
              Multi Agents <br />
              Platform for <br />
              Visual Content Generation
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-lg">
                <Rocket className="w-6 h-6 text-slate-900" />
              </div>
              <span className="text-2xl font-bold text-white">Content Creator</span>
            </div>
          </div>

          {/* Auth Card - Dark Theme */}
          <div className="bg-[#1c1e26] rounded-2xl shadow-2xl p-10 border border-slate-700/50 min-h-[580px] flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white text-center">
                {isLogin ? 'Log In' : 'Sign Up'}
              </h2>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-white placeholder-gray-500"
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-white placeholder-gray-500 text-base"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-white placeholder-gray-500 text-base"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Continue' : 'Create Account'
                )}
              </button>
            </form>


            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                }}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <a href="#" className="text-sm text-teal-500 hover:text-teal-400 transition-colors">
                  Forgot Password?
                </a>
              </div>
            )}
          </div>

          {/* Footer - Removed legal links as per request */}
        </div>
      </div>
    </div>
  )
}
