'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/modules/auth'
import type { AuthUser } from '@/lib/api/contracts'
import { AUTH_STORAGE_KEYS, getStoredItem, setStoredItem, removeStoredItem, SESSION_CHANGED_EVENT } from '@/lib/api/storage'
import { clearClientApiCache } from '@/lib/api/client'
import type { UserRole } from '@/types'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  role: UserRole | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserRole>
  fastLogin: (targetRole: UserRole) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  error: string | null
  setError: (err: string | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = getStoredItem(AUTH_STORAGE_KEYS.user)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    removeStoredItem(AUTH_STORAGE_KEYS.user)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const synchronize = () => {
      setToken(getStoredItem(AUTH_STORAGE_KEYS.token))
      setUser(readStoredUser())
    }
    window.addEventListener(SESSION_CHANGED_EVENT, synchronize)
    window.addEventListener('storage', synchronize)
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, synchronize)
      window.removeEventListener('storage', synchronize)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.me()
    setUser(profile)
    const remember = !!localStorage.getItem(AUTH_STORAGE_KEYS.token)
    setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(profile), remember)
  }, [])

  // Initialize from storage on mount
  useEffect(() => {
    const storedToken = getStoredItem(AUTH_STORAGE_KEYS.token)
    const storedUser = readStoredUser()
    setToken(storedToken)
    setUser(storedUser)

    if (storedToken) {
      authApi.me()
        .then((u) => {
          if (u.role) u.role = u.role.toLowerCase() as any
          setUser(u)
          const remember = typeof window !== 'undefined' && !!localStorage.getItem(AUTH_STORAGE_KEYS.token)
          setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(u), remember)
          setError(null)
        })
        .catch((err) => {
          console.warn('Initial session check failed:', err)
          clearClientApiCache()
          removeStoredItem(AUTH_STORAGE_KEYS.token)
          removeStoredItem(AUTH_STORAGE_KEYS.refreshToken)
          removeStoredItem(AUTH_STORAGE_KEYS.user)
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, rememberMe = true) => {
      setError(null)
      setLoading(true)
      try {
        const response = await authApi.login(email, password)
        const userRole = (response.user.role || 'student').toLowerCase() as UserRole
        response.user.role = userRole as any

        setToken(response.token)
        setUser(response.user)
        setStoredItem(AUTH_STORAGE_KEYS.token, response.token, rememberMe)
        setStoredItem(AUTH_STORAGE_KEYS.refreshToken, response.refreshToken, rememberMe)
        setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(response.user), rememberMe)

        return userRole
      } catch (err: any) {
        const msg = err?.message || 'Đăng nhập không thành công'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fastLogin = useCallback(
    async (targetRole: UserRole) => {
      const credentials: Record<UserRole, { email: string; pass: string }> = {
        admin: { email: 'admin@fpt.edu.vn', pass: 'admin123' },
        lecturer: { email: 'lecturer@fpt.edu.vn', pass: 'lecturer123' },
        student: { email: 'student@fpt.edu.vn', pass: 'student123' },
      }
      const cred = credentials[targetRole]
      const role = await login(cred.email, cred.pass, true)
      if (role === 'admin') router.push('/admin')
      else if (role === 'lecturer') router.push('/lecturer')
      else router.push('/student')
    },
    [login, router]
  )

  const logout = useCallback(() => {
    clearClientApiCache()
    removeStoredItem(AUTH_STORAGE_KEYS.token)
    removeStoredItem(AUTH_STORAGE_KEYS.refreshToken)
    removeStoredItem(AUTH_STORAGE_KEYS.user)
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const role = (user?.role?.toLowerCase() as UserRole) || null

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        fastLogin,
        logout,
        refreshProfile,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
