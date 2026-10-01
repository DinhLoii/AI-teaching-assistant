import { request } from '../client'
import type { AuthUser } from '../contracts'

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; refreshToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  register: (body: { email: string; password: string; fullName: string; externalId?: string }) =>
    request<{ token: string; refreshToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  me: () => request<AuthUser>('/auth/me').then(u => {
    if (u?.role) u.role = u.role.toLowerCase() as any
    return u
  }),

  updateProfile: (data: FormData) => request<any>('/auth/profile', { method: 'PATCH', body: data }),

  dismissPasswordChange: () => request<void>('/auth/dismiss-password-change', { method: 'POST' }),

  changePassword: (body: unknown) => request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (body: { email: string, otp: string, newPassword: string }) => request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
}
