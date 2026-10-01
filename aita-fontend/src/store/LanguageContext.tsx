'use client'

import { TRANSLATIONS } from '@/lib/i18n/messages'
import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'vi' | 'en'

export interface LanguageOption {
  code: Language
  label: string
  flag: string
  name: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'vi', label: 'VI', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
]

export { TRANSLATIONS } from '@/lib/i18n/messages'

export interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string, fallback?: string | Record<string, any>, params?: Record<string, any>) => string
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aita-lang') as Language | null
      if (stored === 'vi' || stored === 'en') {
        setLanguageState(stored)
      }
    } catch {}
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('aita-lang', lang)
    } catch {}
  }

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi')
  }

  const t = (key: string, fallback?: string | Record<string, any>, params?: Record<string, any>): string => {
    const fallbackStr: string | undefined = typeof fallback === 'string' ? fallback : undefined
    const paramObj: Record<string, any> | undefined = typeof fallback === 'object' && fallback !== null ? fallback : params

    let val = TRANSLATIONS[language]?.[key] ?? fallbackStr ?? TRANSLATIONS.vi[key] ?? key

    if (paramObj) {
      Object.entries(paramObj).forEach(([k, v]) => {
        val = val.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v))
        val = val.replace(new RegExp(`{\\s*${k}\\s*}`, 'g'), String(v))
      })
    }
    return val
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
