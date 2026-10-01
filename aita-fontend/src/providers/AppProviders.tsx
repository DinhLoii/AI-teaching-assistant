'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from './auth-provider'
import { ThemeProvider } from './theme-provider'
import { LanguageProvider } from './language-provider'
import { NotificationProvider } from './notification-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
