import type { ReactNode } from 'react'

export type UserRole = 'admin' | 'lecturer' | 'student'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  badge?: string
  category?: string
}

export interface BreadcrumbItem {
  label: string
  path?: string
  /** In-page navigation for drill-down views that have no route of their own. */
  onClick?: () => void
}

export interface StatMetric {
  id: string
  label: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: any
  status?: 'up' | 'down' | 'warning'
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

export interface TabItem {
  id: string
  label: string
}

export interface FilterOption {
  value: string
  label: string
}

export interface Option {
  value: string
  label: string
}
