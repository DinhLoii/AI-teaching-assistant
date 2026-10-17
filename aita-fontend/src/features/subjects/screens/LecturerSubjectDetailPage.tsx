'use client'
import * as React from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { useLanguage } from '@/providers/language-provider'
import { SubjectSyllabus, DEFAULT_SUBJECT_DESCRIPTIONS } from '../components/SubjectSyllabus'

export default function LecturerSubjectDetailPage() {
  const params = useParams()
  const idOrCode = (params?.id as string) || (params?.code as string) || ''

  const { language } = useLanguage()
  const isVi = language === 'vi'

  const [subject, setSubject] = React.useState<any>(null)
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!idOrCode) return

    setLoading(true)
    Promise.all([
      subjectsApi.getSubjects(1, 1000).catch(() => []),
      subjectsApi.getSubject(idOrCode).catch(() => null),
      assignmentsApi.getAssignments().catch(() => []),
    ])
      .then(([subjectsList, directSubject, allAssignments]) => {
        let found = (directSubject as any)?.data || directSubject

        if (!found && subjectsList && subjectsList.length > 0) {
          found = subjectsList.find(
            (s: any) =>
              String(s.id).toLowerCase() === idOrCode.toLowerCase() ||
              (s.code && s.code.toLowerCase() === idOrCode.toLowerCase()) ||
              (s.SubjectCode && s.SubjectCode.toLowerCase() === idOrCode.toLowerCase())
          )
        }

        const codeUpper = (found?.code || found?.SubjectCode || idOrCode).toUpperCase()

        if (found) {
          setSubject(found)
        } else {
          setSubject({
            id: idOrCode,
            code: codeUpper,
            name: `${codeUpper} - Course Subject`,
            description: DEFAULT_SUBJECT_DESCRIPTIONS[codeUpper] || 'Chương trình đào tạo kỹ thuật phần mềm chuẩn Đại học FPT.',
            credits: 3,
          })
        }

        // Filter assignments matching this subject code or id
        const subjectAssignments = (allAssignments || []).filter((a: any) => {
          const sId = String(found?.id || (found as any)?.Id || idOrCode)
          return (
            (a.subjectId && sId && a.subjectId === sId) ||
            (a.subjectName && a.subjectName.toLowerCase() === codeUpper.toLowerCase()) ||
            (a.title && a.title.toLowerCase().includes(codeUpper.toLowerCase()))
          )
        })
        setAssignments(subjectAssignments)
      })
      .finally(() => setLoading(false))
  }, [idOrCode])

  const code = (subject?.code || subject?.SubjectCode || idOrCode).toUpperCase()
  return (
    <DashboardLayout navItems={LECTURER_NAV} title="AITA Lecturer" roleLabel="Giảng viên" requiredRole="lecturer"
      headerTitle={code + ' — ' + (subject?.name || subject?.SubjectName || code)}
      headerSubtitle={isVi ? 'Đề cương chi tiết, chuẩn đầu ra (CLO/ABET) và bài tập môn học' : 'Course syllabus, CLO/ABET mapping, and assignments'}>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">{isVi ? 'Đang tải đề cương...' : 'Loading syllabus...'}</p>
        : <SubjectSyllabus key={idOrCode} subject={subject} assignments={assignments} management />}
    </DashboardLayout>
  )
}
