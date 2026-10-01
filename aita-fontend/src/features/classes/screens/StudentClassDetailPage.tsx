'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { ArrowLeft, BookOpen, Clock, FileText, CheckCircle2 } from 'lucide-react'

export default function StudentClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = (params?.id as string) || ''
  const [classData, setClassData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const { t } = useLanguage()

  React.useEffect(() => {
    if (classId) {
      studentPortalApi.getStudentClassDetail(classId)
        .then((data) => setClassData(data))
        .catch((err) => {
          console.error(err)
          // router.push('/student/classes')
        })
        .finally(() => setLoading(false))
    }
  }, [classId, router])

  if (loading) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="flex justify-center items-center h-64 text-slate-500">
          Đang tải thông tin lớp học...
        </div>
      </DashboardLayout>
    )
  }

  if (!classData) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="flex flex-col justify-center items-center h-64 text-slate-500 space-y-4">
          <p>Không tìm thấy lớp học.</p>
          <Button variant="outline" onClick={() => router.push('/student/classes')}>Quay lại</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={`${classData.classCode || 'Lớp học'} - ${classData.subject?.code || ''}`}
      headerSubtitle={classData.subject?.name || 'Chi tiết lớp học'}
    >
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/student/classes')} className="gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white -ml-3">
            <ArrowLeft className="w-4 h-4" />
            {t('student.classes.back', 'Quay lại danh sách lớp')}
          </Button>
          
          <Badge variant="orange" className="font-mono">{classData.semester?.season} {classData.semester?.code}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-orange-500" />
                Danh sách Bài tập (Assignments)
              </h3>
              
              {!classData.assignments || classData.assignments.length === 0 ? (
                <div className="text-center p-8 text-slate-400 border border-dashed rounded-xl">
                  Lớp học này chưa có bài tập nào.
                </div>
              ) : (
                <div className="space-y-4">
                  {classData.assignments.map((assignment: any) => (
                    <Card key={assignment.id} className="p-4 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{assignment.title}</h4>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{assignment.description}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> 
                              Hạn nộp: {new Date(assignment.dueDate).toLocaleString()}
                            </span>
                            {assignment.isSubmitted && (
                              <Badge variant="success" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1"/> Đã nộp</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                          variant={assignment.isSubmitted ? "outline" : "primary"}
                          className="shrink-0"
                        >
                          {assignment.isSubmitted ? 'Xem lại bài nộp' : 'Làm bài ngay'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Thông tin môn học</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã môn:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">{classData.subject?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên môn:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">{classData.subject?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp:</span>
                  <span className="font-mono font-medium text-orange-600 dark:text-orange-400">{classData.classCode}</span>
                </div>
                
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/student/courses/${classData.subject?.code}`)}>
                    <BookOpen className="w-4 h-4" />
                    Xem Syllabus (Đề cương)
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
