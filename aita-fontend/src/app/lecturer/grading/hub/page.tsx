import { Suspense } from 'react'
import GradingHubPage from '@/features/grading/screens/GradingHubPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải trung tâm chấm bài...</div>}>
      <GradingHubPage />
    </Suspense>
  )
}
