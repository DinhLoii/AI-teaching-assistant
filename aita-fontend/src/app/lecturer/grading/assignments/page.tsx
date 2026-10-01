import { Suspense } from 'react'
import LecturerAssignmentsPage from '@/features/assignments/screens/LecturerAssignmentsPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LecturerAssignmentsPage />
    </Suspense>
  )
}
