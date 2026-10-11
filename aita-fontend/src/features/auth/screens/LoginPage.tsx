'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { PasswordReset } from '@/features/auth/components/PasswordReset'
import { loginDestination } from '@/lib/auth/redirect'
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  MapPin,
  ChevronDown,
} from 'lucide-react'

const CAMPUSES = [
  { id: 'hanoi', name: 'FPT Hanoi (Hòa Lạc)', code: 'FU-HN' },
  { id: 'hcm', name: 'FPT Ho Chi Minh City', code: 'FU-HCM' },
  { id: 'danang', name: 'FPT Da Nang', code: 'FU-DN' },
  { id: 'cantho', name: 'FPT Can Tho', code: 'FU-CT' },
  { id: 'quynhon', name: 'FPT Quy Nhon', code: 'FU-QN' },
] as const

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get('redirect') ?? null
  const { login, isAuthenticated, role } = useAuth()

  const [campus, setCampus] = React.useState('hanoi')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [showGoogleModal, setShowGoogleModal] = React.useState(false)
  const [googleEmail, setGoogleEmail] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Persist and load selected campus
  React.useEffect(() => {
    try {
      const savedCampus = localStorage.getItem('fptu_campus')
      if (savedCampus && CAMPUSES.some((c) => c.id === savedCampus)) {
        setCampus(savedCampus)
      }
    } catch {}
  }, [])

  const handleCampusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setCampus(val)
    try {
      localStorage.setItem('fptu_campus', val)
      const found = CAMPUSES.find((c) => c.id === val)
      if (found) {
        localStorage.setItem('fptu_campus_name', found.name)
        localStorage.setItem('fptu_campus_code', found.code)
      }
    } catch {}
  }

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(loginDestination(redirect, role))
    }
  }, [isAuthenticated, role, redirect, router])

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMessage(null)
    setIsLoading(true)
    try {
      const userRole = await login(loginEmail, loginPass, rememberMe)
      router.replace(loginDestination(redirect, userRole))
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Login failed. Please verify credentials.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMessage('Please enter your username/email and password.')
      return
    }
    await executeLogin(email, password)
  }

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!googleEmail.trim()) return

    const trimmed = googleEmail.trim().toLowerCase()
    setIsGoogleLoading(true)
    setErrorMessage(null)

    // Password mapping for known accounts or default
    let pass = 'student123'
    if (trimmed.includes('admin')) pass = 'admin123'
    else if (trimmed.includes('teach') || trimmed.includes('lectur')) pass = trimmed.includes('teach') ? 'teacher123' : 'lecturer123'

    try {
      setShowGoogleModal(false)
      await executeLogin(trimmed, pass)
    } catch {
      // error handled inside executeLogin
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-7">
      {/* Brand Header */}
      <div className="space-y-3 text-center">
        {/* FPT University Logo */}
        <div className="flex items-center justify-center -mt-6 sm:-mt-10 mb-3 sm:mb-5">
          <Image
            src="/fpt-logo.png"
            alt="FPT University"
            width={480}
            height={200}
            className="h-28 sm:h-32 md:h-36 w-auto object-contain transition-transform duration-300 hover:scale-105"
            priority
          />
        </div>

        {/* Project Name and Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            AI Teaching & Grading Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            AITA Intelligent Grading & Analytics System
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in-50 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Username / Email Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-orange-500" />
            <span>Username or Email</span>
          </label>
          <div className="relative flex items-center rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/15 focus-within:shadow-[0_4px_20px_rgba(249,115,22,0.12)] transition-all duration-200 group">
            <div className="pl-4 text-slate-400 group-focus-within:text-orange-500 transition-colors flex items-center">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              autoComplete="username"
              placeholder="Username or email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent px-3.5 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            />
          </div>
        </div>

        {/* Password Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-orange-500" />
            <span>Password</span>
          </label>
          <div className="relative flex items-center rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/15 focus-within:shadow-[0_4px_20px_rgba(249,115,22,0.12)] transition-all duration-200 group">
            <div className="pl-4 text-slate-400 group-focus-within:text-orange-500 transition-colors flex items-center">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent px-3.5 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none tracking-wide [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#0f172a_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="pr-4 pl-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none flex items-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Campus Selection (under password) */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>Campus</span>
          </label>
          <div className="relative flex items-center rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/15 focus-within:shadow-[0_4px_20px_rgba(249,115,22,0.12)] transition-all duration-200 group">
            <div className="pl-4 text-slate-400 group-focus-within:text-orange-500 transition-colors flex items-center pointer-events-none">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={campus}
              onChange={handleCampusChange}
              className="w-full bg-transparent px-3.5 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer appearance-none pr-10"
            >
              {CAMPUSES.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1"
                >
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            <div className="absolute right-4 pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors flex items-center">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-orange-500 focus:ring-orange-500/30"
            />
            <span>Remember me</span>
          </label>
          <PasswordReset />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3.5 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all"
          isLoading={isLoading}
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center py-1">
        <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
        <span className="absolute px-3 bg-slate-50/90 dark:bg-slate-950/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          or
        </span>
      </div>

      {/* Google / Gmail Sign In Button */}
      <button
        type="button"
        onClick={() => setShowGoogleModal(true)}
        disabled={isLoading || isGoogleLoading}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:border-orange-500/40 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group backdrop-blur-sm"
      >
        <GoogleIcon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
        <span>
          {isGoogleLoading ? 'Connecting...' : 'Sign in with Gmail'}
        </span>
      </button>

      {/* Google Login Prompt Modal */}
      <Modal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        title="Sign in with Gmail"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40">
            <GoogleIcon className="w-6 h-6 shrink-0" />
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-orange-600 dark:text-orange-400">[Demo Simulation] </span>
              Enter your FPT or Gmail address to authenticate. Matches seed demo accounts (Admin, Lecturer, Student).
            </div>
          </div>

          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email
              </label>
              <Input
                type="email"
                placeholder="name@gmail.com"
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3"
              isLoading={isGoogleLoading}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col md:flex-row overflow-hidden transition-colors relative">

      {/* Left side: Mascot & Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative items-center justify-center p-8 lg:p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-orange-400/20 dark:bg-orange-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-lighten" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-lighten" />
        </div>
        
        <div className="relative z-10 max-w-lg w-full flex flex-col items-center justify-center space-y-8">
          <div className="relative w-full aspect-square max-w-[520px] flex items-center justify-center">
            {/* Ambient floor shadow */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-orange-950/15 dark:bg-black/40 blur-2xl rounded-full pointer-events-none" />
            <Image
              src="/mascot.png"
              alt="FPTU Toad Mascot"
              fill
              sizes="(min-width: 1280px) 520px, (min-width: 1024px) calc(58.333vw - 6rem), (min-width: 768px) calc(50vw - 6rem), 0px"
              className="object-contain drop-shadow-[0_20px_35px_rgba(249,115,22,0.18)]"
              priority
            />
          </div>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Image
                src="/fpt-logo.png"
                alt="FPT University"
                width={200}
                height={85}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              AI Teaching & Grading Assistant
            </h2>
            <p className="text-slate-600 dark:text-slate-300 font-medium max-w-md mx-auto">
              AI-powered grading and analytics system tailored for FPTU students and lecturers.
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Seamless Login Area (NO CARD BOX, Merged into Page) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 md:p-14 lg:p-16 relative z-10">
        <div className="w-full max-w-sm sm:max-w-md flex-1 flex flex-col justify-center py-6">
          <React.Suspense fallback={<div className="text-slate-400 text-sm">Loading...</div>}>
            <LoginForm />
          </React.Suspense>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-auto pt-4">
          © {new Date().getFullYear()} AI Teaching Assistant — FPT University.
        </p>
      </div>
    </div>
  )
}
