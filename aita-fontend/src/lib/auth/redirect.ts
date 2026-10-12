export function loginDestination(redirect: string | null, role?: string | null): string {
  const normalizedRole = role?.toLowerCase()
  const home = normalizedRole === 'admin'
    ? '/admin'
    : normalizedRole === 'lecturer'
    ? '/lecturer'
    : '/student'

  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || /[\\\u0000-\u001f]/.test(redirect)) {
    return home
  }

  const pathname = redirect.split(/[?#]/)[0]

  // Allow profile page for any authenticated user
  if (pathname === '/profile') {
    return redirect
  }

  // Ensure redirect target matches the user's role prefix
  if (normalizedRole === 'admin') {
    return pathname === '/admin' || pathname.startsWith('/admin/') ? redirect : home
  }
  if (normalizedRole === 'lecturer') {
    return pathname === '/lecturer' || pathname.startsWith('/lecturer/') ? redirect : home
  }
  if (normalizedRole === 'student') {
    return pathname === '/student' || pathname.startsWith('/student/') ? redirect : home
  }

  return home
}
