export function loginDestination(redirect: string | null, role: string): string {
  const home = role === 'admin' ? '/admin' : role === 'lecturer' ? '/lecturer' : '/student'
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || /[\\\u0000-\u001f]/.test(redirect)) return home
  const pathname = redirect.split(/[?#]/)[0]
  return pathname === '/profile' || pathname === home || pathname.startsWith(`${home}/`) ? redirect : home
}
