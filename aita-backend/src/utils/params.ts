import type { Request } from 'express'

export function param(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? v[0] : (v ?? '')
}
