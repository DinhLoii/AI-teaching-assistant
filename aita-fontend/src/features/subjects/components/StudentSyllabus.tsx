'use client'

import * as React from 'react'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { SubjectRow } from '@/lib/api/contracts'
import { SubjectSyllabus } from './SubjectSyllabus'

export default function StudentSyllabus({ subjectId }: { subjectId?: string }) {
  const { language } = useLanguage()
  const isVi = language === 'vi'
  const [subject, setSubject] = React.useState<SubjectRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [attempt, retry] = React.useReducer(value => value + 1, 0)

  React.useEffect(() => {
    let active = true
    setSubject(null)
    setError(false)
    if (!subjectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    void subjectsApi.getSubject(subjectId)
      .then(data => { if (active) setSubject(data) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [subjectId, attempt])

  if (loading) {
    return <p role="status" className="p-8 text-center text-sm text-slate-500 animate-pulse">{isVi ? 'Đang tải đề cương môn học...' : 'Loading course syllabus...'}</p>
  }
  if (error) {
    return (
      <Card className="p-8 text-center space-y-3">
        <p role="alert" className="text-sm text-rose-600">{isVi ? 'Không thể tải đề cương môn học. Vui lòng thử lại.' : 'Unable to load the course syllabus. Please try again.'}</p>
        <Button variant="outline" size="sm" onClick={retry}>{isVi ? 'Thử lại' : 'Retry'}</Button>
      </Card>
    )
  }
  return <SubjectSyllabus key={subjectId} subject={subject} />
}
