'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
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
  Bot,
  Plus,
  School,
  BarChart2,
  Users,
  Check,
  ClipboardList,
  FolderGit2,
} from 'lucide-react'

const DEFAULT_SUBJECT_DESCRIPTIONS: Record<string, string> = {
  PRF192: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.',
  PRO192: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.',
  CSD201: 'Upon finishing the course, students can: 1) Knowledge: Understand (ABET e) - the connection between data structures and their algorithms, including an analysis of algorithms complexity; - data structure in the context of object-oriented program design; - how data structure are implemented in an OO programming language such as Java 2) Able to (ABET e) - organize and manipulate basic structures: array, linked list, tree, heap, hash - use algorithms for traversing, sorting, searching on studying structures - select a suitable algorithm to solve a practical problem 3) Able to (ABET k) - use JAVA programming language for solving some problems - use Eclipse tool for developing programs in JAVA - Implement some programs in JAVA to solve practical problems based on the studying algorithms 4) Others: (ABET i) - Improve study skills (academic reading, information searching, ...)',
  DBI202: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).',
  PRJ301: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.',
  PRN212: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.',
  SWP391: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.',
  WDP301: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.',
  PRM392: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.',
  SWD392: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.',
}

type TabType = 'overview' | 'clos' | 'sessions' | 'assessment' | 'assignments'

export default function LecturerSubjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idOrCode = (params?.id as string) || (params?.code as string) || ''

  const { language, t } = useLanguage()
  const isVi = language === 'vi'

  const [subject, setSubject] = React.useState<any>(null)
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<TabType>('overview')
  const [sessionSearch, setSessionSearch] = React.useState('')

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

  // Parse Syllabus Data with comprehensive fallbacks
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
      (isVi
        ? 'Môn học cung cấp kiến thức nền tảng và chuyên sâu về cấu trúc dữ liệu, giải thuật và phát triển phần mềm theo tiêu chuẩn đào tạo của Đại học FPT.'
        : 'Provides fundamental and advanced knowledge on data structures, algorithms and software development.')

    const credits = parsed?.credits ?? parsed?.noCredit ?? subject?.credits ?? subject?.credit ?? 3
    const degreeLevel = parsed?.degreeLevel || 'Bachelor'
    const timeAllocation = parsed?.timeAllocation || 'Study hour (150h) = 45h contact hours + 1h TE + 85\' PE + 102.6h self-study'
    const prerequisites = parsed?.prerequisites || parsed?.preRequisite || (code === 'CSD201' ? 'PRO192' : 'None')

    const studentTasks: string[] = Array.isArray(parsed?.studentTasks)
      ? parsed.studentTasks
      : isVi
      ? [
          'Sinh viên phải tham gia tối thiểu 80% thời lượng các buổi học để đủ điều kiện thi cuối kỳ (FE).',
          'Hoàn thành đầy đủ các bài tập Lab, Practical Exam và Assignment đúng hạn trên hệ thống AITA.',
          'Sử dụng máy tính cá nhân trong lớp học đúng mục đích nghiên cứu và thực hành lập trình.',
          'Chủ động tra cứu tài liệu học tập, slide bài giảng và cập nhật thông báo trên cổng thông tin FLM / AITA.',
        ]
      : [
          'Attend at least 80% of classes to be eligible for Final Exam (FE).',
          'Complete all Lab, Practical Exam and Assignments on AITA.',
          'Use personal laptop in class for programming and research purposes.',
          'Proactively review materials and check notices on FLM/AITA.',
        ]

    const tools: string[] = parsed?.tools || [
      'VS Code / IntelliJ IDEA / NetBeans',
      'Git / GitHub',
      'Java JDK 17 / .NET 8 / C++ Compiler',
      'SQL Server / PostgreSQL',
    ]

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

    const clos =
      (parsed?.clos || []).length > 0
        ? parsed.clos.map((c: any) => ({
            code: c.code || c.cloName || 'CLO',
            details: c.details || c.cloDetails || '',
            loDetails: c.loDetails || '',
          }))
        : isVi
        ? [
            { code: 'CLO1', loDetails: 'LO1', details: 'Nắm vững các khái niệm và cú pháp lập trình căn bản, phân tích độ phức tạp thuật toán.' },
            { code: 'CLO2', loDetails: 'LO2', details: 'Áp dụng các cấu trúc dữ liệu tuyến tính (Array, Linked List, Stack, Queue) vào bài toán.' },
            { code: 'CLO3', loDetails: 'LO3', details: 'Thiết kế và thao tác cấu trúc dữ liệu phi tuyến tính (Binary Tree, BST, Heap, Graph).' },
            { code: 'CLO4', loDetails: 'LO4', details: 'Hiện thực các giải thuật tìm kiếm, sắp xếp và đồ thị với độ phức tạp tối ưu.' },
            { code: 'CLO5', loDetails: 'LO5', details: 'Xây dựng giải pháp kỹ thuật có kiểm thử, quản lý bộ nhớ và xử lý lỗi an toàn.' },
            { code: 'CLO6', loDetails: 'LO6', details: 'Sử dụng thành thạo môi trường phát triển (IDE) và công cụ gỡ lỗi (Debugger).' },
            { code: 'CLO7', loDetails: 'LO7', details: 'Khả năng đọc hiểu tài liệu kỹ thuật và giải thuật chuẩn quốc tế.' },
            { code: 'CLO8', loDetails: 'LO8', details: 'Ý thức bảo vệ mã nguồn, tuân thủ nguyên tắc liêm chính học thuật và đạo đức nghề nghiệp.' },
          ]
        : [
            { code: 'CLO1', loDetails: 'LO1', details: 'Master basic programming concepts and algorithmic complexity analysis.' },
            { code: 'CLO2', loDetails: 'LO2', details: 'Apply linear data structures (Array, Linked List, Stack, Queue) to practical problems.' },
            { code: 'CLO3', loDetails: 'LO3', details: 'Design and manipulate non-linear data structures (Binary Tree, BST, Heap, Graph).' },
            { code: 'CLO4', loDetails: 'LO4', details: 'Implement searching, sorting and graph algorithms with optimal efficiency.' },
            { code: 'CLO5', loDetails: 'LO5', details: 'Build robust applications with testing and exception handling.' },
            { code: 'CLO6', loDetails: 'LO6', details: 'Proficiently use IDEs, Git and debugging tools.' },
            { code: 'CLO7', loDetails: 'LO7', details: 'Read and understand technical literature and standard algorithms.' },
            { code: 'CLO8', loDetails: 'LO8', details: 'Adhere to professional ethics, academic integrity and code safety.' },
          ]

    const assessments =
      (parsed?.assessments || parsed?.assessmentScheme || []).length > 0
        ? (parsed?.assessments || parsed?.assessmentScheme || []).map((a: any) => ({
            category: a.category || a.name || 'Assessment',
            weightPercent: (a.weightPercent ?? parseFloat(String(a.weight || '0').replace('%', ''))) || 0,
          }))
        : [
            { category: 'Progress test (PT)', weightPercent: 20 },
            { category: 'Assignment (AS)', weightPercent: 20 },
            { category: 'Practical Exam', weightPercent: 30 },
            { category: 'Final exam', weightPercent: 30 },
          ]

    const totalSessionsCount = code === 'CSD201' ? 60 : 30
    const sessions =
      (parsed?.sessions || []).length > 0
        ? parsed.sessions.map((ses: any, index: number) => ({
            sessionNo: ses.sessionNo ?? (ses.session || index + 1),
            topic: ses.topic || '',
            type: ses.type || (index % 3 === 0 ? 'Online Lab' : 'Offline Lecture'),
            clo: ses.clo || `CLO${(index % 8) + 1}`,
            itu: ses.itu || (index < 10 ? 'I' : index < 30 ? 'T' : 'U'),
            studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : ses.studentTasks || '',
            materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || '#',
          }))
        : Array.from({ length: totalSessionsCount }, (_, i) => ({
            sessionNo: i + 1,
            topic: `Slot ${i + 1}: ${
              isVi
                ? i < 15
                  ? 'Kiến thức nền tảng & Cấu trúc dữ liệu tuyến tính'
                  : i < 35
                  ? 'Cấu trúc cây, Heap & Bảng băm'
                  : i < 50
                  ? 'Giải thuật đồ thị (Graph Algorithms) & Tối ưu hóa'
                  : 'Thực hành dự án, Đánh giá PE & Ôn tập cuối kỳ'
                : i < 15
                ? 'Fundamentals & Linear Data Structures'
                : i < 35
                ? 'Tree Structures, Heap & Hash Tables'
                : i < 50
                ? 'Graph Algorithms & Optimization'
                : 'Practical Project, PE Prep & Final Review'
            }`,
            type: i % 3 === 0 ? 'Online Lab' : 'Offline Lecture',
            clo: `CLO${(i % 8) + 1}`,
            itu: i < 15 ? 'I' : i < 40 ? 'T' : 'U',
            studentTasks: isVi
              ? 'Nghiên cứu tài liệu trước buổi học, hoàn thành code bài tập tại lớp.'
              : 'Study materials before class, complete coding exercises in class.',
            materialsDownloadUrl: '#',
          }))

    return {
      name: parsed?.name || subject?.name || subject?.SubjectName || `${code} — Data Structures and Algorithms`,
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
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel="Giảng viên"
      requiredRole="lecturer"
      headerTitle={`${code} — ${syllabus.name}`}
      headerSubtitle={
        isVi
          ? 'Đề cương chi tiết, chuẩn đầu ra (CLO/ABET) và bài tập môn học'
          : 'Course syllabus, CLO/ABET mapping, and assignments'
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/lecturer/subjects')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại môn học' : 'Back to Subjects'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/lecturer" className="hover:underline">Lecturer</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/lecturer/subjects" className="hover:underline">Subjects</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-orange-500 font-bold">{code}</span>
          </div>
        </div>

        {/* Hero Header Banner (Exact match with screenshot 3) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-blue-500/5 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 relative overflow-hidden shadow-xs dark:shadow-xl transition-all">
          <div className="space-y-4 max-w-4xl relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange" className="font-mono text-xs px-2.5 py-1">
                {code}
              </Badge>
              <Badge variant="outline" className="text-xs bg-white/60 dark:bg-slate-900/60 font-medium">
                {syllabus.degreeLevel}
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold">
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
                <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>
                  {isVi ? 'Thời lượng' : 'Duration'}:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{syllabus.timeAllocation}</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>
                  {isVi ? 'Tiên quyết' : 'Prerequisites'}:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{syllabus.prerequisites}</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>
                  {isVi ? 'Tổng số buổi' : 'Total Sessions'}:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{syllabus.sessions.length}</strong>
                </span>
              </span>
            </div>

            {/* Quick Lecturer Action Buttons on Banner */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href={`/lecturer/prompts/${subject?.id || idOrCode}`}>
                <Button size="sm" variant="outline" className="text-xs bg-white/80 dark:bg-slate-900/80 hover:bg-orange-500 hover:text-white border-orange-300 dark:border-orange-500/40 text-orange-600 dark:text-orange-400 gap-1.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Cấu hình Prompt AI môn' : 'Configure Subject Prompt'}</span>
                </Button>
              </Link>
              <Link href={`/lecturer/grading/assignments?create=true&subjectId=${subject?.id || idOrCode}`}>
                <Button size="sm" variant="primary" className="text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tạo bài tập / Đề thi' : 'Create Assignment'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs with Dynamic Badge Counts */}
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
            <span>{isVi ? 'Bài tập & Đề thi' : 'Assignments'}</span>
            <Badge variant="orange" className="text-[10px] px-1.5 py-0">
              {assignments.length}
            </Badge>
          </button>
        </div>

        {/* TAB 1: OVERVIEW (Matching Screenshot 3) */}
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
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{lo.category}</span>
                        <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                          {lo.code}
                        </Badge>
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
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
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
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
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
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">{a.category}</span>
                      <Badge variant="orange" className="font-mono text-xs">
                        {a.weightPercent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Lecturer Fast Hub Card */}
              <Card className="p-6 border-orange-500/20 bg-orange-50/30 dark:bg-orange-950/10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-500" />
                  {isVi ? 'Tác vụ giảng viên' : 'Lecturer Hub'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  {isVi
                    ? 'Quản lý kho prompt, ngân hàng đề bài và bộ tiêu chí Rubric cho môn học này.'
                    : 'Manage prompts, assignment bank, and AI grading rubrics for this subject.'}
                </p>
                <div className="space-y-2">
                  <Link href={`/lecturer/prompts/${subject?.id || idOrCode}`} className="block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs bg-white dark:bg-slate-900">
                      <span className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isVi ? 'Cấu hình AI Prompt chuẩn' : 'Subject AI Prompts'}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/lecturer/grading/assignments?create=true&subjectId=${subject?.id || idOrCode}`} className="block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs bg-white dark:bg-slate-900">
                      <span className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isVi ? 'Tạo bài tập / Đề thi mới' : 'New Assignment / Exam'}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href="/lecturer/classes" className="block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs bg-white dark:bg-slate-900">
                      <span className="flex items-center gap-2">
                        <School className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isVi ? 'Xem lớp đang phụ trách môn' : 'Teaching Classes'}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
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
                  {isVi
                    ? 'Chi tiết các tiêu chuẩn năng lực sinh viên cần đạt sau khi hoàn tất môn học'
                    : 'Detailed competence criteria expected upon course completion'}
                </p>
              </div>
              <Badge variant="orange" className="text-xs font-semibold">
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
                      <td className="p-3 text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
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
                  {isVi
                    ? 'Kế hoạch từng slot học, tài liệu giảng dạy và nhiệm vụ của sinh viên'
                    : 'Schedule of each slot, teaching materials and student tasks'}
                </p>
              </div>

              <div className="w-full sm:w-72">
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm kiếm slot, chủ đề...' : 'Search slot, topic...'}
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 text-xs"
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
                      <td className="p-3 text-center font-mono text-orange-600 dark:text-orange-400 font-semibold">
                        {ses.clo}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                        {ses.itu}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                        {ses.studentTasks}
                      </td>
                      <td className="p-3 text-center">
                        <a
                          href={ses.materialsDownloadUrl === '#' ? '#' : ses.materialsDownloadUrl}
                          target={ses.materialsDownloadUrl === '#' ? '_self' : '_blank'}
                          rel="noreferrer"
                          onClick={(e) => {
                            if (ses.materialsDownloadUrl === '#') {
                              e.preventDefault()
                              alert(isVi ? 'Tài liệu học tập đang được đồng bộ từ FPT FLM.' : 'Material is syncing from FLM.')
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] h-6 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors font-medium"
                        >
                          <Download className="w-3 h-3" />
                          <span>{isVi ? 'Tải về' : 'Download'}</span>
                        </a>
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
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {isVi ? 'Cơ cấu và Trọng số điểm số môn học' : 'Assessment Scheme & Weights'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                {isVi
                  ? 'Bảng phân bổ tỷ lệ phần trăm các đầu điểm đánh giá quá trình và thi kết thúc môn'
                  : 'Breakdown of continuous assessment and final exam score percentages'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {syllabus.assessments.map((a: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{a.category}</span>
                      <Badge variant="orange" className="font-mono text-xs">
                        {a.weightPercent}%
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${a.weightPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVi
                        ? `Chiếm ${a.weightPercent}% trong tổng điểm tổng kết môn học.`
                        : `Accounts for ${a.weightPercent}% of the overall final grade.`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {isVi ? 'Quy định & Điều kiện qua môn (Passing Criteria)' : 'Passing Criteria'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Tham gia tối thiểu 80% tổng số buổi học trên lớp (Attendance >= 80%).' : 'Attend at least 80% of total class slots.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm thi thực hành Practical Exam (PE) phải đạt tối thiểu từ 4.0/10 trở lên.' : 'Practical Exam (PE) score must be at least 4.0/10.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm thi lý thuyết cuối kỳ Final Exam (FE) phải đạt tối thiểu từ 4.0/10 trở lên.' : 'Final Exam (FE) score must be at least 4.0/10.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm trung bình tổng kết môn học đạt từ 5.0/10 trở lên.' : 'Overall final course grade must be 5.0/10 or higher.'}</span>
                </li>
              </ul>
            </Card>
          </div>
        )}

        {/* TAB 5: ASSIGNMENTS (For Lecturer) */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVi ? `Bài tập & Đề kiểm tra thuộc môn ${code}` : `Assignments for ${code}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isVi
                    ? 'Danh sách các bài tập đã giao cho sinh viên, tình trạng nộp và chấm điểm'
                    : 'List of assignments assigned to students, submission status and grading'}
                </p>
              </div>
              <Link href={`/lecturer/grading/assignments?create=true&subjectId=${subject?.id || idOrCode}`}>
                <Button size="sm" variant="primary" className="text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tạo bài tập mới' : 'New Assignment'}</span>
                </Button>
              </Link>
            </div>

            {assignments.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-3">
                <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Chưa có bài tập nào cho môn học này' : 'No assignments created yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isVi
                    ? 'Bạn có thể tạo bài tập mới, cấu hình barem Rubric chấm tự động bằng AI và giao cho các lớp đang phụ trách.'
                    : 'You can create a new assignment, set up AI grading rubrics and assign it to your classes.'}
                </p>
                <Link href={`/lecturer/grading/assignments?create=true&subjectId=${subject?.id || idOrCode}`}>
                  <Button size="sm" variant="primary" className="mt-2 text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Tạo bài tập ngay' : 'Create Assignment Now'}</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assign: any) => {
                  const isClosed = assign.status === 'closed' || assign.status === 'grading'
                  const isDraft = assign.status === 'draft'

                  return (
                    <Card
                      key={assign.id}
                      className="p-5 border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={isDraft ? 'outline' : isClosed ? 'warning' : 'orange'}
                            className="text-[10px] uppercase font-bold"
                          >
                            {assign.status || 'Active'}
                          </Badge>
                          {assign.strategy && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {assign.strategy}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {assign.title}
                        </h4>

                        {assign.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {assign.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>
                            {assign.dueAt || assign.dueDate
                              ? new Date(assign.dueAt || assign.dueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
                              : 'Không thời hạn'}
                          </span>
                        </span>

                        <div className="flex items-center gap-2">
                          <Link href={`/lecturer/assignments/${assign.id}/submissions`}>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2.5">
                              {isVi ? 'Vào chấm bài' : 'Submissions'}
                            </Button>
                          </Link>
                          <Link href={`/lecturer/assignments/${assign.id}`}>
                            <Button size="sm" variant="primary" className="text-xs h-7 px-2.5">
                              {isVi ? 'Cấu hình' : 'Workspace'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}