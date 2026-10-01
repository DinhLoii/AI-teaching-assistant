import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import LecturerSubmissionsPage from '@/features/submissions/screens/LecturerSubmissionsPage'

export default function Page() {
  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel="Lecturer"
      requiredRole="lecturer"
      title="Danh sách bài nộp"
    >
      <LecturerSubmissionsPage />
    </DashboardLayout>
  )
}
