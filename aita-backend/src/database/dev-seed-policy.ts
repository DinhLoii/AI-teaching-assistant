export function canSeedDemoAccounts(environment: Record<string, string | undefined>) {
  if (environment.NODE_ENV !== 'development' || environment.ENABLE_DEV_SEED !== 'true') return false
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(environment.DATABASE_URL || '').hostname) }
  catch { return false }
}
