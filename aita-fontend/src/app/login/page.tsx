import { Suspense } from 'react'
import LoginPage from '@/features/auth/screens/LoginPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải đăng nhập...</div>}>
      <LoginPage />
    </Suspense>
  )
}
