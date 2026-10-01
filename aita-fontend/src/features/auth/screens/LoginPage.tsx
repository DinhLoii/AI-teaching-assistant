'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'
import { LiveClock } from '@/features/notes/components/LiveClock'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PasswordReset } from '@/features/auth/components/PasswordReset'
import { loginDestination } from '@/lib/auth/redirect'
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get('redirect') ?? null
  const { login, isAuthenticated, role } = useAuth()
  const { language } = useLanguage()

  const isVi = language === 'vi'

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(loginDestination(redirect, role))
    }
  }, [isAuthenticated, role, redirect, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMessage(isVi ? 'Vui lòng nhập đầy đủ Email và Mật khẩu.' : 'Please enter your Email and Password.')
      return
    }
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const userRole = await login(email, password, rememberMe)
      router.replace(loginDestination(redirect, userRole))
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isVi ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.' : 'Login failed. Please verify credentials.')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Brand Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isVi ? 'Chào mừng trở lại' : 'Welcome back'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isVi ? 'Sử dụng email FPT (@fpt.edu.vn) để đăng nhập' : 'Use your FPT email (@fpt.edu.vn) to access'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email FPT</label>
          <Input
            type="email"
            placeholder="name@fpt.edu.vn"
            icon={<Mail className="w-4 h-4 text-slate-400" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-50 dark:bg-slate-900/50"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isVi ? 'Mật khẩu' : 'Password'}
            </label>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4 text-slate-400" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
                aria-label={showPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiện mật khẩu' : 'Show password')}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-50 dark:bg-slate-900/50"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-orange-500 focus:ring-orange-500/30"
            />
            <span>{isVi ? 'Ghi nhớ đăng nhập' : 'Remember me'}</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
          isLoading={isLoading}
        >
          <span>{isVi ? 'Đăng nhập hệ thống' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
      <PasswordReset />
    </div>
  )
}

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()

  const isVi = language === 'vi'

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden transition-colors relative">
      {/* Top Floating Utility Bar on Login: Back Home, Language, Theme */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft size={14} />
          <span>{isVi ? 'Về trang chủ' : 'Back to Home'}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Realtime clock (no notes when unauthenticated) */}
          <div className="hidden sm:block">
            <LiveClock showNotes={false} />
          </div>

          <LanguageDropdown />

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? t('nav.theme.dark', 'Chế độ tối') : t('nav.theme.light', 'Chế độ sáng')}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md text-slate-700 hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-400 transition-all"
          >
            {theme === 'light' ? (
              <Moon size={17} />
            ) : (
              <Sun size={17} />
            )}
          </button>
        </div>
      </div>

      {/* Left side: Mascot & Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative bg-orange-50 dark:bg-orange-950/20 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-orange-400/20 dark:bg-orange-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-lighten" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-lighten" />
        </div>
        
        <div className="relative z-10 max-w-lg w-full flex flex-col items-center justify-center space-y-8">
          <div className="relative w-full aspect-square max-w-[500px] drop-shadow-2xl">
            <Image
              src="/mascot.jpg"
              alt="FPTU Toad Mascot"
              fill
              sizes="(min-width: 1280px) 500px, (min-width: 1024px) calc(58.333vw - 6rem), (min-width: 768px) calc(50vw - 6rem), 0px"
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-800/60 shadow-sm">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">FPT University</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              AI Teaching & Grading Assistant
            </h2>
            <p className="text-slate-600 dark:text-slate-300 font-medium max-w-md mx-auto">
              {isVi 
                ? 'Hệ thống hỗ trợ chấm điểm và phân tích bằng Trí Tuệ Nhân Tạo dành riêng cho sinh viên và giảng viên FPTU.'
                : 'AI-powered grading and analytics system tailored for FPTU students and lecturers.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 md:p-16 relative z-10 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
          <div className="md:hidden flex items-center justify-center mb-8">
             <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F26F21] to-[#FB923C] flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-2xl text-slate-900 dark:text-white">AITA</span>
              <Badge variant="orange" className="text-[10px] py-0 px-1.5">FPTU</Badge>
            </div>
          </div>
          
          <React.Suspense fallback={<div className="text-slate-400 text-sm">Đang tải...</div>}>
            <LoginForm />
          </React.Suspense>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-auto pt-8">
          © {new Date().getFullYear()} AI Teaching Assistant — Đại Học FPT.
        </p>
      </div>
    </div>
  )
}
