import { Suspense } from 'react'
import ProfilePage from '@/features/profile/screens/ProfilePage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải hồ sơ...</div>}>
      <ProfilePage />
    </Suspense>
  )
}
