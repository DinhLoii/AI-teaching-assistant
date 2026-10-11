export function loginDestination(redirect: string | null, _role: string): string {
  const home = '/student'
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || /[\\\u0000-\u001f]/.test(redirect)) return home
  const pathname = redirect.split(/[?#]/)[0]
  return pathname === '/profile' || pathname === home || pathname.startsWith(`${home}/`) || pathname.startsWith('/admin') || pathname.startsWith('/lecturer') ? redirect : home
}
