import { Suspense } from 'react'
import LiveJobPage from '@/features/grading/screens/LiveJobPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang khởi tạo phiên chấm live...</div>}>
      <LiveJobPage />
    </Suspense>
  )
}
