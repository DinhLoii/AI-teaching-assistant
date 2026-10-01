'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { useLanguage } from '@/providers/language-provider'
import {
  BookOpen,
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Search,
  Award,
  AlertCircle,
  ExternalLink,
  Layers,
  Laptop,
  ArrowRight,
  Code2,
} from 'lucide-react'

const DEFAULT_SUBJECT_DESCRIPTIONS: Record<string, string> = {
  PRF192: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.',
  PRO192: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.',
  CSD201: 'Core data structures & algorithms: linked lists, stacks, queues, trees, BSTs, heaps, hash tables, graphs, and Big-O complexity analysis.',
  DBI202: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).',
  PRJ301: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.',
  PRN212: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.',
  SWP391: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.',
  WDP301: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.',
  PRM392: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.',
  SWD392: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.',
}

type TabType = 'overview' | 'clos' | 'sessions' | 'assessment' | 'assignments'

export default function StudentSubjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawCode = (params?.code as string) || ''
  const code = rawCode.toUpperCase()

  const { language, t } = useLanguage()
  const isVi = language === 'vi'

  const [subject, setSubject] = React.useState<any>(null)
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<TabType>('overview')
  const [sessionSearch, setSessionSearch] = React.useState('')

  React.useEffect(() => {
    if (!code) return

    setLoading(true)
    Promise.all([
      subjectsApi.getSubjects(1, 1000).catch(() => []),
      assignmentsApi.getAssignments().catch(() => []),
    ])
      .then(([subjectsList, allAssignments]) => {
        const found = (subjectsList || []).find(
          (s: any) =>
            (s.code && s.code.toLowerCase() === code.toLowerCase()) ||
            (s.SubjectCode && s.SubjectCode.toLowerCase() === code.toLowerCase())
        )

        if (found) {
          setSubject(found)
        } else {
          setSubject({
            id: code,
            code: code,
            name: `${code} - Course Subject`,
            description: DEFAULT_SUBJECT_DESCRIPTIONS[code] || 'Chương trình đào tạo kỹ thuật phần mềm chuẩn Đại học FPT.',
            credits: 3,
          })
        }

        // Filter assignments matching this subject code or id
        const subjectAssignments = (allAssignments || []).filter((a: any) => {
          const sId = String(found?.id || (found as any)?.Id || '')
          return (
            (a.subjectId && sId && a.subjectId === sId) ||
            (a.subjectName && a.subjectName.toLowerCase() === code.toLowerCase()) ||
            (a.title && a.title.toLowerCase().includes(code.toLowerCase()))
          )
        })
        setAssignments(subjectAssignments)
      })
      .finally(() => setLoading(false))
  }, [code])

  // Parse Syllabus Data
  const syllabus = React.useMemo(() => {
    let parsed: any = null
    if (subject?.syllabusData) {
      try {
        parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
      } catch {
        parsed = null
      }
    }

    const desc =
      parsed?.description ||
      subject?.description ||
      DEFAULT_SUBJECT_DESCRIPTIONS[code] ||
      (isVi ? 'Môn học cung cấp kiến thức nền tảng và chuyên sâu về cấu trúc dữ liệu, giải thuật và phát triển phần mềm theo tiêu chuẩn đào tạo của Đại học FPT.' : 'Provides fundamental and advanced knowledge on data structures, algorithms and software development.')

    const credits = parsed?.credits ?? parsed?.noCredit ?? subject?.credits ?? 3
    const degreeLevel = parsed?.degreeLevel || 'Bachelor of Software Engineering'
    const timeAllocation = parsed?.timeAllocation || '150 giờ (45h tiếp xúc trên lớp + 1h thi cuối kỳ + 104h tự học)'
    const prerequisites = parsed?.prerequisites || parsed?.preRequisite || 'None'

    const studentTasks: string[] = Array.isArray(parsed?.studentTasks)
      ? parsed.studentTasks
      : isVi ? [
          'Sinh viên phải tham gia tối thiểu 80% thời lượng các buổi học để đủ điều kiện thi cuối kỳ (FE).',
          'Hoàn thành đầy đủ các bài tập Lab, Practical Exam và Assignment đúng hạn trên hệ thống AITA.',
          'Sử dụng máy tính cá nhân trong lớp học đúng mục đích nghiên cứu và thực hành lập trình.',
          'Chủ động tra cứu tài liệu học tập, slide bài giảng và cập nhật thông báo trên cổng thông tin FLM / AITA.',
        ] : [
          'Attend at least 80% of classes to be eligible for Final Exam (FE).',
          'Complete all Lab, Practical Exam and Assignments on AITA.',
          'Use personal laptop in class for programming and research purposes.',
          'Proactively review materials and check notices on FLM/AITA.',
        ]

    const tools: string[] = parsed?.tools || ['VS Code / IntelliJ IDEA / NetBeans', 'Git / GitHub', 'Java JDK 17 / .NET 8 / C++ Compiler', 'SQL Server / PostgreSQL']

    const defaultLearningOutcomes = [
      {
        category: isVi ? '1. Kiến thức cốt lõi' : '1. Core Knowledge',
        code: '(ABET e)',
        items: [
          'Hiểu rõ các nguyên lý thuật toán, cấu trúc dữ liệu và mô hình hướng đối tượng.',
          'Nắm vững quy trình thiết kế, kiểm thử và tối ưu mã nguồn theo chuẩn công nghiệp.',
        ],
      },
      {
        category: isVi ? '2. Kỹ năng lập trình & Giải quyết vấn đề' : '2. Programming Skills',
        code: '(ABET k)',
        items: [
          'Hiện thực hóa thuật toán và cấu trúc dữ liệu vào giải quyết bài toán thực tế.',
          'Tổ chức mã nguồn khoa học, xử lý ngoại lệ và debug lỗi hiệu quả.',
        ],
      },
      {
        category: isVi ? '3. Tác phong & Làm việc nhóm' : '3. Professional Practice',
        code: '(ABET i)',
        items: [
          'Kỹ năng tự nghiên cứu tài liệu kỹ thuật tiếng Anh chuyên ngành.',
          'Tuân thủ đạo đức nghề nghiệp, bảo mật mã nguồn và bản quyền phần mềm.',
        ],
      },
    ]

    const learningOutcomes = parsed?.learningOutcomes || defaultLearningOutcomes

    const clos = (parsed?.clos || []).length > 0
      ? parsed.clos.map((c: any) => ({
          code: c.code || c.cloName || 'CLO',
          details: c.details || c.cloDetails || '',
          loDetails: c.loDetails || '',
        }))
      : isVi ? [
          { code: 'CLO1', loDetails: 'LO1', details: 'Nắm vững các khái niệm và cú pháp lập trình căn bản.' },
          { code: 'CLO2', loDetails: 'LO2', details: 'Áp dụng các cấu trúc dữ liệu và giải thuật vào giải quyết bài toán nghiệp vụ.' },
          { code: 'CLO3', loDetails: 'LO3', details: 'Phân tích độ phức tạp thời gian/không gian thuật toán và tối ưu hóa.' },
          { code: 'CLO4', loDetails: 'LO4', details: 'Xây dựng ứng dụng hoàn chỉnh có kiểm thử và xử lý lỗi an toàn.' },
        ] : [
          { code: 'CLO1', loDetails: 'LO1', details: 'Master basic programming concepts and syntax.' },
          { code: 'CLO2', loDetails: 'LO2', details: 'Apply data structures and algorithms to business problems.' },
          { code: 'CLO3', loDetails: 'LO3', details: 'Analyze time/space complexity and optimization.' },
          { code: 'CLO4', loDetails: 'LO4', details: 'Build complete apps with testing and error handling.' },
        ]

    const assessments = (parsed?.assessments || parsed?.assessmentScheme || []).length > 0
      ? (parsed?.assessments || parsed?.assessmentScheme || []).map((a: any) => ({
          category: a.category || a.name || 'Assessment',
          weightPercent: (a.weightPercent ?? parseFloat(String(a.weight || '0').replace('%', ''))) || 0,
        }))
      : [
          { category: 'Attendance & Participation', weightPercent: 10 },
          { category: 'Assignment 1 & 2 (AI Grading)', weightPercent: 20 },
          { category: 'Progress Tests (PT)', weightPercent: 15 },
          { category: 'Practical Exam (PE)', weightPercent: 25 },
          { category: 'Final Exam (FE)', weightPercent: 30 },
        ]

    // Default 30 sessions if not in syllabus
    const sessions = (parsed?.sessions || []).length > 0
      ? parsed.sessions.map((ses: any, index: number) => ({
          sessionNo: ses.sessionNo ?? ses.session ?? (index + 1),
          topic: ses.topic || '',
          type: ses.type || 'Offline',
          clo: ses.clo || 'CLO1',
          itu: ses.itu || 'I',
          studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : (ses.studentTasks || ''),
          materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || (ses.sDownload ? '#' : undefined),
        }))
      : Array.from({ length: 30 }, (_, i) => ({
          sessionNo: i + 1,
          topic: `Slot ${i + 1}: ${isVi ? (i < 10 ? 'Kiến thức nền tảng & Cấu trúc cơ bản' : i < 20 ? 'Thuật toán nâng cao & Thao tác cấu trúc' : 'Thực hành dự án, Kiểm thử & Đánh giá') : (i < 10 ? 'Fundamental Knowledge & Data Structures' : i < 20 ? 'Advanced Algorithms & Manipulation' : 'Project Practice, Testing & Evaluation')}`,
          type: i % 4 === 0 ? 'Online Lab' : 'Offline Lecture',
          clo: i < 10 ? 'CLO1' : i < 20 ? 'CLO2' : 'CLO3',
          itu: i < 10 ? 'I' : i < 20 ? 'T' : 'U',
          studentTasks: isVi ? 'Nghiên cứu tài liệu trước buổi học, hoàn thành code bài tập tại lớp.' : 'Study materials before class, complete coding exercises in class.',
          materialsDownloadUrl: '#',
        }))

    return {
      name: parsed?.name || subject?.name || subject?.SubjectName || `${code} - ${isVi ? 'Chuyên ngành CNTT' : 'IT Major'}`,
      code: code,
      description: desc,
      credits,
      degreeLevel,
      timeAllocation,
      prerequisites,
      studentTasks,
      tools,
      learningOutcomes,
      clos,
      assessments,
      sessions,
    }
  }, [subject, code, isVi])

  const filteredSessions = React.useMemo(() => {
    if (!sessionSearch.trim()) return syllabus.sessions
    const q = sessionSearch.toLowerCase()
    return syllabus.sessions.filter(
      (s: any) =>
        s.topic.toLowerCase().includes(q) ||
        s.studentTasks.toLowerCase().includes(q) ||
        String(s.sessionNo).includes(q)
    )
  }, [syllabus.sessions, sessionSearch])

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={`${code} — ${syllabus.name}`}
      headerSubtitle={isVi ? 'Đề cương chi tiết, chuẩn đầu ra (CLO/ABET) và bài tập môn học' : 'Course syllabus, CLO/ABET mapping, and assignments'}
    >
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/student/courses')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại danh sách môn học' : 'Back to Courses'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/student" className="hover:underline">Student</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/student/courses" className="hover:underline">Courses</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-orange-500 font-bold">{code}</span>
          </div>
        </div>

        {/* Hero Header Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-blue-500/5 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 relative overflow-hidden shadow-xs dark:shadow-xl transition-all">
          <div className="space-y-4 max-w-3xl relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange" className="font-mono text-xs px-2.5 py-1">
                {code}
              </Badge>
              <Badge variant="outline" className="text-xs bg-white/60 dark:bg-slate-900/60">
                {syllabus.degreeLevel}
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                {syllabus.credits} {isVi ? 'Tín chỉ' : 'Credits'}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {syllabus.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {syllabus.description}
            </p>

            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>{isVi ? 'Thời lượng' : 'Duration'}: <strong className="text-slate-700 dark:text-slate-200">{syllabus.timeAllocation}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                <span>{isVi ? 'Tiên quyết' : 'Prerequisites'}: <strong className="text-slate-700 dark:text-slate-200">{syllabus.prerequisites}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>{isVi ? 'Tổng số buổi' : 'Total Sessions'}: <strong className="text-slate-700 dark:text-slate-200">{syllabus.sessions.length}</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isVi ? 'Tổng quan đề cương' : 'Syllabus Overview'}
          </button>
          <button
            onClick={() => setActiveTab('clos')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'clos'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isVi ? `Chuẩn đầu ra CLO (${syllabus.clos.length})` : `CLO List (${syllabus.clos.length})`}
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'sessions'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isVi ? `Lịch trình buổi học (${syllabus.sessions.length})` : `Sessions (${syllabus.sessions.length})`}
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'assessment'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isVi ? 'Cơ cấu điểm số' : 'Assessment Scheme'}
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'assignments'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>{isVi ? 'Bài tập nộp bài' : 'Assignments'}</span>
            <Badge variant="orange" className="text-[10px] px-1.5 py-0">
              {assignments.length}
            </Badge>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Learning Outcomes (ABET) */}
              <Card className="p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-500" />
                  {isVi ? 'Mục tiêu học tập & Chuẩn ABET' : 'Course Learning Outcomes (ABET)'}
                </h3>
                <div className="space-y-4">
                  {syllabus.learningOutcomes.map((lo: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{lo.category}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{lo.code}</Badge>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {lo.items.map((it: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Student Tasks */}
              <Card className="p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  {isVi ? 'Yêu cầu & Nhiệm vụ của sinh viên' : 'Student Tasks & Requirements'}
                </h3>
                <div className="space-y-2.5">
                  {syllabus.studentTasks.map((task: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                      <span className="font-mono font-bold text-orange-500 shrink-0 mt-0.5">{idx + 1}.</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{task}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Tools & Tech Stack */}
              <Card className="p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-orange-500" />
                  {isVi ? 'Công cụ & Phần mềm' : 'Tools & Software'}
                </h3>
                <div className="space-y-2">
                  {syllabus.tools.map((tool: string, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Assessment Preview Box */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    {isVi ? 'Tóm tắt đầu điểm' : 'Grading Scheme'}
                  </h3>
                  <button
                    onClick={() => setActiveTab('assessment')}
                    className="text-xs text-orange-500 hover:underline font-semibold"
                  >
                    {isVi ? 'Chi tiết' : 'Details'}
                  </button>
                </div>
                <div className="space-y-2.5">
                  {syllabus.assessments.map((a: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{a.category}</span>
                      <Badge variant="orange" className="font-mono text-xs">
                        {a.weightPercent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: CLOS */}
        {activeTab === 'clos' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Danh mục Chuẩn đầu ra môn học (Course Learning Outcomes)' : 'Course Learning Outcomes (CLOs)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isVi ? 'Chi tiết các tiêu chuẩn năng lực sinh viên cần đạt sau khi hoàn tất môn học' : 'Detailed competence criteria expected upon course completion'}
                </p>
              </div>
              <Badge variant="orange" className="text-xs">
                {syllabus.clos.length} CLOs
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-28 text-center font-bold">{isVi ? 'Mã CLO' : 'CLO Code'}</th>
                    <th className="p-3 w-32 font-bold">{isVi ? 'Ánh xạ LO' : 'LO Mapping'}</th>
                    <th className="p-3 font-bold">{isVi ? 'Nội dung chi tiết' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {syllabus.clos.map((clo: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-bold text-orange-600 dark:text-orange-400 font-mono">
                        {clo.code}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 font-mono">
                        {clo.loDetails || clo.code.replace('CLO', 'LO')}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-200 leading-relaxed">
                        {clo.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: SESSIONS */}
        {activeTab === 'sessions' && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Lịch trình bài giảng & Buổi học chi tiết' : 'Detailed Session Schedule'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isVi ? 'Kế hoạch từng slot học, tài liệu và nhiệm vụ thực hành' : 'Schedule of each slot, learning materials and tasks'}
                </p>
              </div>

              <div className="w-full sm:w-72">
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm kiếm slot, chủ đề...' : 'Search slot, topic...'}
                  icon={<Search className="w-4 h-4 text-slate-400" />}
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-16 text-center font-bold">Slot</th>
                    <th className="p-3 font-bold">{isVi ? 'Chủ đề bài học (Topic)' : 'Topic'}</th>
                    <th className="p-3 w-28 text-center font-bold">{isVi ? 'Hình thức' : 'Type'}</th>
                    <th className="p-3 w-20 text-center font-bold">CLO</th>
                    <th className="p-3 w-16 text-center font-bold">ITU</th>
                    <th className="p-3 font-bold">{isVi ? 'Nhiệm vụ sinh viên' : 'Student Tasks'}</th>
                    <th className="p-3 w-28 text-center font-bold">{isVi ? 'Tài liệu' : 'Materials'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSessions.map((ses: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        #{ses.sessionNo}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {ses.topic}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={ses.type.includes('Online') ? 'blue' : 'outline'} className="text-[10px]">
                          {ses.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono text-orange-600 dark:text-orange-400">
                        {ses.clo}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                        {ses.itu}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                        {ses.studentTasks}
                      </td>
                      <td className="p-3 text-center">
                        {ses.materialsDownloadUrl ? (
                          <a
                            href={ses.materialsDownloadUrl === '#' ? '#' : ses.materialsDownloadUrl}
                            target={ses.materialsDownloadUrl === '#' ? '_self' : '_blank'}
                            rel="noreferrer"
                            onClick={(e) => {
                              if (ses.materialsDownloadUrl === '#') {
                                e.preventDefault();
                                alert(isVi ? 'Tài liệu đang được cập nhật.' : 'Material is being updated.');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[10px] h-6 px-2 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors font-medium"
                          >
                            <Download className="w-3 h-3" />
                            {isVi ? 'Tải về' : 'Download'}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: ASSESSMENT */}
        {activeTab === 'assessment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                {isVi ? 'Cơ cấu & Trọng số đầu điểm' : 'Assessment Weights'}
              </h3>
              <div className="space-y-3">
                {syllabus.assessments.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{a.category}</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        {isVi ? 'Đánh giá năng lực theo chuẩn FLM' : 'Competency assessment per FLM standards'}
                      </p>
                    </div>
                    <Badge variant="orange" className="font-mono text-xs px-2.5 py-1">
                      {a.weightPercent}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {isVi ? 'Quy chế & Điều kiện qua môn (Passing Criteria)' : 'Passing Criteria'}
              </h3>
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{isVi ? '1. Điều kiện tham gia thi cuối kỳ (FE/PE):' : '1. Eligibility for Final Exam (FE/PE):'}</span>
                  <p className="text-[11px] leading-relaxed">
                    {isVi ? 'Sinh viên không nghỉ quá 20% tổng số buổi học và hoàn thành đầy đủ các bài tập Assignment.' : 'Students must not miss more than 20% of total classes and must complete all Assignments.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40 space-y-1">
                  <span className="font-bold text-orange-700 dark:text-orange-400">{isVi ? '2. Điểm liệt các phần thi:' : '2. Minimum exam scores:'}</span>
                  <p className="text-[11px] leading-relaxed">
                    {isVi ? 'Điểm thi thực hành (PE) & Điểm thi lý thuyết cuối kỳ (FE) phải đạt tối thiểu từ 4.0 / 10.0 điểm trở lên.' : 'Practical Exam (PE) & Final Exam (FE) scores must be at least 4.0 / 10.0.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-1">
                  <span className="font-bold text-blue-700 dark:text-blue-400">{isVi ? '3. Điểm tổng kết môn:' : '3. Final subject score:'}</span>
                  <p className="text-[11px] leading-relaxed">
                    {isVi ? 'Điểm tổng kết trung bình có trọng số (Final Average Grade) đạt từ 5.0 / 10.0 trở lên để tính là qua môn.' : 'Final Average Grade must be at least 5.0 / 10.0 to pass the course.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVi ? `Bài tập & Đề thi của môn ${code}` : `Assignments for ${code}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isVi ? 'Các bài tập thực hành được chấm điểm tự động bằng Rubric AI' : 'Practical assignments automatically graded by AI Rubric'}
                </p>
              </div>
              <Badge variant="orange" className="text-xs">
                {assignments.length} {isVi ? 'Bài tập' : 'Assignments'}
              </Badge>
            </div>

            {assignments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>{isVi ? 'Hiện chưa có bài tập nào mở nộp cho môn học này.' : 'No active assignments for this subject at the moment.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assign: any) => (
                  <div
                    key={assign.id}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 bg-white/70 dark:bg-slate-900/40 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="orange" className="text-[11px]">
                          {assign.type || 'Assignment'}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {isVi ? 'Hạn nộp' : 'Due'}: {assign.dueAt ? new Date(assign.dueAt).toLocaleDateString('vi-VN') : (isVi ? 'Không giới hạn' : 'No limit')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                        {assign.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {assign.description || (isVi ? 'Đóng gói mã nguồn bài làm thành file .zip để nộp lên hệ thống AITA.' : 'Package your source code into a .zip file and submit to AITA.')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">{isVi ? 'Barem' : 'Scale'} 10.0</span>
                      <Link href={`/student/assignments/${assign.id}`}>
                        <Button variant="primary" size="sm" className="text-xs gap-1">
                          <span>{isVi ? 'Nộp bài ngay' : 'Submit Code'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
