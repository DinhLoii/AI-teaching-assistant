import { Suspense } from 'react'
import AdminUsersPage from '@/features/users/screens/AdminUsersPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải danh sách người dùng...</div>}>
      <AdminUsersPage />
    </Suspense>
  )
}
