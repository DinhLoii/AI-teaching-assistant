import { Suspense } from 'react'
import AssignmentUploadPage from '@/features/grading/screens/AssignmentUploadPage'

export default function LecturerAssignmentUploadRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải tạo bài tập...</div>}>
      <AssignmentUploadPage />
    </Suspense>
  )
}
