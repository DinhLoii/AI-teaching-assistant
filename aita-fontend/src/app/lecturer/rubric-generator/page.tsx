import { LecturerAIRubricPage } from '@/features/grading/screens/LecturerAIRubricPage'
import { Suspense } from 'react'

export const metadata = {
  title: 'AI Rubric Generator - Giảng viên',
}

export default function Page() {
  return (
    <Suspense fallback={<div role="status" className="p-8 text-center text-sm text-slate-500 animate-pulse">Đang tải công cụ tạo Rubric AI...</div>}>
      <LecturerAIRubricPage />
    </Suspense>
  )
}
