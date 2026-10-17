'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/providers/language-provider'
import {
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Award,
  Laptop,
  ArrowRight,
  Bot,
  Plus,
  School,
  Check,
  ClipboardList,
  Search,
  Layers,
  Code2,
  Database,
  Server,
  Cpu,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Info,
  Compass,
  PieChart,
} from 'lucide-react'

export const DEFAULT_SUBJECT_DESCRIPTIONS: Record<string, string> = {
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

// Helper to parse description with structured Knowledge & Skills
function parseDescriptionSections(description: string) {
  if (!description) return { intro: '', knowledge: [], skills: [] }
  
  const knowledgeMatch = description.match(/a\)\s*Knowledge:[^\n]*\n([\s\S]*?)(?=b\)\s*Skills:|$)/i)
  const skillsMatch = description.match(/b\)\s*Skills:[^\n]*\n([\s\S]*?)$/i)
  
  const extractItems = (raw: string) => {
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean)
  }
  
  const introMatch = description.split(/a\)\s*Knowledge:/i)[0]?.trim() || ''

  return {
    intro: introMatch,
    knowledge: knowledgeMatch ? extractItems(knowledgeMatch[1]) : [],
    skills: skillsMatch ? extractItems(skillsMatch[1]) : [],
  }
}

export function SubjectSyllabus({ subject, assignments = [], management = false }: {
  subject: any
  assignments?: any[]
  management?: boolean
}) {
  const router = useRouter()
  const { language } = useLanguage()
  const isVi = language === 'vi'
  const idOrCode = subject?.id || subject?.code || ''
  const [activeTab, setActiveTab] = React.useState<TabType>('overview')
  const [sessionSearch, setSessionSearch] = React.useState('')
  const [sessionFilter, setSessionFilter] = React.useState<'all' | 'lecture' | 'lab' | 'exam'>('all')
  const [cloSearch, setCloSearch] = React.useState('')
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
    const timeAllocation = parsed?.timeAllocation || 'Study hour (150h) = 45h contact hours + 1h final exam + 85\' practical exam + 102.6h self-study'
    const prerequisites = parsed?.prerequisites || parsed?.preRequisite || (code === 'CSD201' ? 'PRO192' : code === 'PRJ301' ? 'DBI202, PRO192' : 'None')

    const studentTasks: string[] = Array.isArray(parsed?.studentTasks) && parsed.studentTasks.length > 0
      ? parsed.studentTasks
      : isVi
      ? [
          'Tham gia tối thiểu 80% thời lượng các buổi học để đủ điều kiện thi cuối kỳ (FE).',
          'Chủ động nghiên cứu tài liệu giáo trình và slide bài giảng trước mỗi buổi học.',
          'Tích cực tham gia các buổi học, bài thực hành Classwork và trao đổi học thuật trên lớp.',
          'Hoàn thành đầy đủ các bài tập Lab, Workshop, Assignment và Practical Exam đúng hạn trên AITA.',
          'Sử dụng máy tính cá nhân trong lớp học cài đặt đầy đủ môi trường phát triển (IDE, Server, RDBMS).',
          'Thường xuyên truy cập cổng thông tin FLM FPT và AITA để cập nhật lịch trình và thông báo mới.',
        ]
      : [
          'Attend at least 80% of contact hours in order to be accepted to the final examination.',
          'Actively participate in class activities and complete hands-on exercises.',
          'Complete all Lab, Workshop, Practical Exam and Assignment tasks on time on AITA.',
          'Use their own laptop in class only for learning and software development purposes.',
          'Read the textbook and lecture slides in advance.',
          'Promptly access FLM FPT and AITA for up-to-date course information and notices.',
        ]

    const tools: string[] = Array.isArray(parsed?.tools) && parsed.tools.length > 0
      ? parsed.tools
      : [
          'Apache Tomcat 9 / 10',
          'NetBeans 13+ / IntelliJ IDEA',
          'Java EE / JDK 1.8+ hoặc JDK 17 LTS',
          'MS SQL Server 2019+ / Azure SQL',
          'Git & GitHub',
          'AI Coding Assistant & Prompt Engineering',
        ]

    const defaultLearningOutcomes = [
      {
        category: isVi ? '1. Kiến thức cốt lõi (Core Knowledge)' : '1. Core Knowledge',
        code: '(ABET e)',
        items: [
          isVi
            ? 'Hiểu rõ kiến trúc ứng dụng Web Java, vòng đời Servlet/JSP, Filter và đối tượng máy chủ.'
            : 'Understand Java Web architecture, Servlet/JSP lifecycle, Filters, and server-side objects.',
          isVi
            ? 'Nắm vững Quản lý trạng thái (State Management): Request, Session, Application context và Cookie.'
            : 'Master state management mechanisms: Request, Session, Application context, and Cookies.',
          isVi
            ? 'Hiểu sâu về kiến trúc MVC, mô hình phân lớp DAO/Service và ánh xạ cơ sở dữ liệu với JDBC/JPA.'
            : 'Master MVC architecture, DAO/Service layers, and database connectivity with JDBC/JPA.',
        ],
      },
      {
        category: isVi ? '2. Kỹ năng lập trình & Phát triển Web' : '2. Web Development Skills',
        code: '(ABET k)',
        items: [
          isVi
            ? 'Xây dựng và triển khai hoàn chỉnh ứng dụng Java Web trên máy chủ Tomcat và môi trường IDE.'
            : 'Build and deploy complete Java Web applications on Tomcat web container using modern IDEs.',
          isVi
            ? 'Tương tác cơ sở dữ liệu quan hệ (MS SQL Server), thực hiện các thao tác CRUD an toàn và tối ưu truy vấn.'
            : 'Connect and query relational databases (MS SQL Server), implementing secure CRUD operations.',
          isVi
            ? 'Ứng dụng kỹ thuật Prompt Engineering và công cụ AI Assistant hỗ trợ lập trình, review code và gỡ lỗi.'
            : 'Apply Prompt Engineering and AI assistant tools to support web development and debugging.',
        ],
      },
      {
        category: isVi ? '3. Tác phong nghề nghiệp & Tự học' : '3. Professional Practice',
        code: '(ABET i)',
        items: [
          isVi
            ? 'Kỹ năng tự tra cứu, đọc hiểu tài liệu kỹ thuật chuẩn tiếng Anh (Jakarta EE, Oracle Java Docs).'
            : 'Improve academic reading and information retrieval from official technical documentation.',
          isVi
            ? 'Tuân thủ đạo đức nghề nghiệp, bảo vệ mã nguồn, phòng ngừa lỗ hổng bảo mật Web (SQL Injection, XSS).'
            : 'Adhere to professional ethics, academic integrity, and standard web security practices.',
        ],
      },
    ]

    const learningOutcomes = (parsed?.learningOutcomes && parsed.learningOutcomes.length > 0)
      ? parsed.learningOutcomes
      : defaultLearningOutcomes

    const defaultClos = [
      { code: 'CLO1', loDetails: 'LO1', details: isVi ? 'Hiểu cấu trúc cơ bản của ứng dụng Web và triển khai Web Application lên Tomcat.' : 'Understand basic web application structure and be able to deploy Web applications.' },
      { code: 'CLO2', loDetails: 'LO2', details: isVi ? 'Nắm vững và làm việc thành thạo với các tính năng cốt lõi của Java Web (Servlet, Request/Response, Session).' : 'Understand and be able to work with the basic features of Java web application.' },
      { code: 'CLO3', loDetails: 'LO3', details: isVi ? 'Kết nối và thao tác dữ liệu với JDBC Driver, thực thi các câu lệnh SQL an toàn.' : 'Be able to work with JDBC and database connectivity.' },
      { code: 'CLO4', loDetails: 'LO4', details: isVi ? 'Sử dụng thành thạo các ngôn ngữ và biểu thức trong JSP (Expression Language - EL, JSTL).' : 'Be able to use different languages and expression syntax in JSP.' },
      { code: 'CLO5', loDetails: 'LO5', details: isVi ? 'Hiểu và làm việc với các đối tượng máy chủ nâng cao (Filter, Event Listener, Cookie).' : 'Understand and be able to work with other server-side objects in Java Web Application.' },
      { code: 'CLO6', loDetails: 'LO6', details: isVi ? 'Thiết kế và phát triển ứng dụng web theo kiến trúc MVC chuẩn (Model-View-Controller).' : 'Understand and be able to work with simple MVC Architecture.' },
      { code: 'CLO7', loDetails: 'LO7', details: isVi ? 'Kết hợp hoàn chỉnh giữa giao diện Web Frontend (HTML/CSS/JS) và tầng xử lý Backend Java.' : 'Be able to combine web front-end & back-end in the Java web application.' },
      { code: 'CLO8', loDetails: 'LO8', details: isVi ? 'Sử dụng công nghệ ánh xạ thực thể JPA/Hibernate trong ứng dụng Java Web.' : 'Be able to use JPA in the Java web application.' },
      { code: 'CLO9', loDetails: 'LO9', details: isVi ? 'Ứng dụng trí tuệ nhân tạo (AI Assistant, Prompt Engineering, Agent) trong ứng dụng Java Web.' : 'Be able to use AI in the Java web application.' },
    ]

    const clos =
      (parsed?.clos || []).length > 0
        ? parsed.clos.map((c: any) => ({
            code: c.code || c.cloName || 'CLO',
            details: c.details || c.cloDetails || '',
            loDetails: c.loDetails || '',
          }))
        : defaultClos

    const defaultAssessments = [
      { category: 'Assignment', weightPercent: 30 },
      { category: 'Practical Exam', weightPercent: 30 },
      { category: 'Progress Test 1', weightPercent: 5 },
      { category: 'Progress Test 2', weightPercent: 5 },
      { category: 'Workshop 1', weightPercent: 5 },
      { category: 'Workshop 2', weightPercent: 5 },
      { category: 'Final Exam', weightPercent: 20 },
    ]

    const assessments =
      (parsed?.assessments || parsed?.assessmentScheme || []).length > 0
        ? (parsed?.assessments || parsed?.assessmentScheme || []).map((a: any) => {
            const rawWeight = a.weightPercent ?? a.weight ?? '0'
            const num = typeof rawWeight === 'number' ? rawWeight : parseFloat(String(rawWeight).replace('%', '')) || 0
            return {
              category: a.category || a.name || 'Assessment',
              weightPercent: num,
              part: a.part || '1',
            }
          })
        : defaultAssessments

    const totalSessionsCount = code === 'CSD201' ? 60 : 56
    const sessions =
      (parsed?.sessions || []).length > 0
        ? parsed.sessions.map((ses: any, index: number) => ({
            sessionNo: ses.sessionNo ?? ses.session ?? (index + 1),
            topic: ses.topic || '',
            type: ses.type || (index % 4 === 0 ? 'Practice' : index % 3 === 0 ? 'Online Lab' : 'Offline Lecture'),
            clo: ses.clo || `CLO${(index % 9) + 1}`,
            itu: ses.itu || (index < 10 ? 'I, T' : index < 35 ? 'T, U' : 'U'),
            studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : ses.studentTasks || (isVi ? 'Đọc tài liệu, hoàn thành bài tập' : 'Read textbook, do exercises'),
            studentMaterials: ses.studentMaterials || ses.materials || (isVi ? 'Giáo trình & Slide bài giảng' : 'Textbook & Slides'),
            materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || '#',
          }))
        : Array.from({ length: totalSessionsCount }, (_, i) => ({
            sessionNo: i + 1,
            topic: `Slot ${i + 1}: ${
              isVi
                ? i < 10
                  ? 'Giới thiệu Java Web, Servlet, JSP và Quản lý Request/Response'
                  : i < 20
                  ? 'Kết nối cơ sở dữ liệu JDBC, Xử lý câu lệnh SQL & CRUD'
                  : i < 36
                  ? 'Kiến trúc MVC, Quản lý Session, Cookie và State Management'
                  : i < 50
                  ? 'Expression Language (EL), Custom Tags, JPA & Tích hợp AI'
                  : 'Đánh giá đồ án môn học, Luyện PE & Ôn tập thi cuối kỳ'
                : i < 10
                ? 'Introduction to Java Web, Servlets, JSP and Request/Response'
                : i < 20
                ? 'Database Connectivity with JDBC, SQL Processing & CRUD'
                : i < 36
                ? 'MVC Architecture, Session & Cookie State Management'
                : i < 50
                ? 'Expression Language (EL), Custom Tags, JPA & AI Integration'
                : 'Assignment Evaluation, Practical Exam Prep & Final Review'
            }`,
            type: i % 4 === 0 ? 'Practice' : i % 3 === 0 ? 'Online Lab' : 'Offline Lecture',
            clo: `CLO${(i % 9) + 1}`,
            itu: i < 10 ? 'I, T' : i < 35 ? 'T, U' : 'U',
            studentTasks: isVi
              ? 'Nghiên cứu tài liệu trước buổi học, hoàn thành code bài tập tại lớp.'
              : 'Study materials before class, complete coding exercises in class.',
            studentMaterials: isVi ? 'Giáo trình Murach Chapter 1-6' : 'Murach Textbook Chapter 1-6',
            materialsDownloadUrl: '#',
          }))

    return {
      hasSyllabus: !!parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0,
      name: parsed?.name || subject?.name || subject?.SubjectName || `${code} — Java Web Application Development`,
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

  const parsedDesc = React.useMemo(() => {
    return parseDescriptionSections(syllabus.description)
  }, [syllabus.description])

  const filteredSessions = React.useMemo(() => {
    let list = syllabus.sessions
    if (sessionFilter === 'lecture') {
      list = list.filter((s: any) => s.type.toLowerCase().includes('lecture') || s.type.toLowerCase().includes('offline'))
    } else if (sessionFilter === 'lab') {
      list = list.filter((s: any) => s.type.toLowerCase().includes('lab') || s.type.toLowerCase().includes('online'))
    } else if (sessionFilter === 'exam') {
      list = list.filter((s: any) => s.topic.toLowerCase().includes('exam') || s.topic.toLowerCase().includes('evaluation') || s.topic.toLowerCase().includes('test'))
    }

    if (!sessionSearch.trim()) return list
    const q = sessionSearch.toLowerCase()
    return list.filter(
      (s: any) =>
        s.topic.toLowerCase().includes(q) ||
        s.studentTasks.toLowerCase().includes(q) ||
        s.clo.toLowerCase().includes(q) ||
        String(s.sessionNo).includes(q)
    )
  }, [syllabus.sessions, sessionSearch, sessionFilter])

  const filteredClos = React.useMemo(() => {
    if (!cloSearch.trim()) return syllabus.clos
    const q = cloSearch.toLowerCase()
    return syllabus.clos.filter(
      (c: any) =>
        c.code.toLowerCase().includes(q) ||
        c.details.toLowerCase().includes(q) ||
        c.loDetails.toLowerCase().includes(q)
    )
  }, [syllabus.clos, cloSearch])

  if (!management && !syllabus.hasSyllabus) {
    return (
      <Card className="p-8 text-center space-y-2">
        <BookOpen className="w-8 h-8 mx-auto text-orange-500" />
        <p className="text-sm font-semibold">{isVi ? 'Chưa có đề cương môn học' : 'Syllabus not available yet'}</p>
        <p className="text-xs text-slate-500">{isVi ? 'Đề cương sẽ hiển thị khi được cập nhật cho môn học này.' : 'The syllabus will appear once it is added to this subject.'}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {management && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/lecturer/subjects')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
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
      )}

      {/* Hero Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-orange-500/5 dark:from-orange-950/40 dark:via-slate-900/90 dark:to-orange-950/30 border border-orange-200/80 dark:border-orange-500/20 relative overflow-hidden shadow-xs dark:shadow-xl transition-all">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-gradient-to-tr from-orange-400/20 via-amber-300/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-4 max-w-5xl relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="orange" className="font-mono text-xs px-2.5 py-1 font-bold">
              {code}
            </Badge>
            <Badge variant="outline" className="text-xs bg-white/70 dark:bg-slate-900/70 border-orange-200/80 font-medium">
              {syllabus.degreeLevel}
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold">
              {syllabus.credits} {isVi ? 'Tín chỉ' : 'Credits'}
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-semibold">
              {isVi ? 'Kỹ thuật phần mềm (SE)' : 'Software Engineering'}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {syllabus.name}
          </h1>

          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-orange-100/60 dark:border-slate-800/60">
            {syllabus.description}
          </div>

          {/* Quick Info Metadata Bar */}
          <div className="pt-3 border-t border-orange-100/90 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                {isVi ? 'Thời lượng' : 'Duration'}:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{syllabus.timeAllocation}</strong>
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                {isVi ? 'Tiên quyết' : 'Prerequisites'}:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold font-mono">{syllabus.prerequisites}</strong>
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                {isVi ? 'Tổng số buổi' : 'Total Sessions'}:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{syllabus.sessions.length} {isVi ? 'buổi' : 'slots'}</strong>
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                {isVi ? 'Chuẩn đào tạo' : 'Standard'}:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">ABET & FPT Curriculum</strong>
              </span>
            </span>
          </div>

          {management && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href={`/lecturer/prompts/${subject?.id || idOrCode}`}>
                <Button size="sm" variant="outline" className="text-xs bg-white/80 dark:bg-slate-900/80 hover:bg-orange-500 hover:text-white border-orange-300 dark:border-orange-500/40 text-orange-600 dark:text-orange-400 gap-1.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Cấu hình Prompt AI môn' : 'Configure Subject Prompt'}</span>
                </Button>
              </Link>
              <Link href={`/lecturer/grading/assignments?create=true&subjectId=${subject?.id || idOrCode}`}>
                <Button size="sm" variant="primary" className="text-xs gap-1.5 shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tạo bài tập / Đề thi' : 'Create Assignment'}</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 w-fit text-xs font-bold shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20 font-bold'
              : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isVi ? 'Tổng quan đề cương' : 'Syllabus Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('clos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'clos'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20 font-bold'
              : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isVi ? `Chuẩn đầu ra CLO (${syllabus.clos.length})` : `CLO List (${syllabus.clos.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20 font-bold'
              : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isVi ? `Lịch trình buổi học (${syllabus.sessions.length})` : `Sessions (${syllabus.sessions.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('assessment')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'assessment'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20 font-bold'
              : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isVi ? 'Cơ cấu điểm số' : 'Assessment Scheme'}</span>
        </button>

        {management && (
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20 font-bold'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isVi ? 'Bài tập & Đề thi' : 'Assignments'}</span>
            <Badge variant="orange" className="text-[10px] px-1.5 py-0 font-mono">
              {assignments.length}
            </Badge>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW                                              */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Knowledge & Skills Structured Cards if present in syllabus description */}
            {(parsedDesc.knowledge.length > 0 || parsedDesc.skills.length > 0) && (
              <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span>{isVi ? 'Mục tiêu Năng lực & Kiến thức' : 'Core Knowledge & Skills Objectives'}</span>
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-medium border-orange-200">
                    FPT Learning Outcomes
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Knowledge Column */}
                  {parsedDesc.knowledge.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                        <GraduationCap className="w-4 h-4 text-amber-600" />
                        <span>{isVi ? 'a) Kiến thức (Knowledge)' : 'a) Knowledge (What will know)'}</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {parsedDesc.knowledge.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills Column */}
                  {parsedDesc.skills.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wide">
                        <Code2 className="w-4 h-4 text-emerald-600" />
                        <span>{isVi ? 'b) Kỹ năng thực hành (Skills)' : 'b) Skills (What can do)'}</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {parsedDesc.skills.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Learning Outcomes (ABET) */}
            <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-500" />
                  <span>{isVi ? 'Mục tiêu học tập & Chuẩn ABET' : 'Course Learning Outcomes (ABET)'}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/40">
                  ABET e, k, i
                </span>
              </div>

              <div className="space-y-4">
                {syllabus.learningOutcomes.map((lo: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        <span>{lo.category}</span>
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50">
                        {lo.code}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {lo.items.map((it: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            {/* Student Tasks */}
            <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>{isVi ? 'Yêu cầu & Nhiệm vụ của sinh viên' : 'Student Tasks & Requirements'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {syllabus.studentTasks.length} {isVi ? 'quy định học vụ' : 'rules'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {syllabus.studentTasks.map((task: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 border border-orange-200/70 dark:border-orange-900/40">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{task}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Tools & Tech Stack */}
            <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-orange-500" />
                <span>{isVi ? 'Công cụ & Phần mềm' : 'Tools & Software'}</span>
              </h3>
              <div className="space-y-2">
                {syllabus.tools.map((tool: string, idx: number) => {
                  const toolLower = tool.toLowerCase()
                  const isServer = toolLower.includes('tomcat') || toolLower.includes('server')
                  const isDb = toolLower.includes('sql') || toolLower.includes('database')
                  const isIde = toolLower.includes('netbeans') || toolLower.includes('intellij') || toolLower.includes('vscode')
                  const isAi = toolLower.includes('ai') || toolLower.includes('copilot') || toolLower.includes('prompt')

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-medium flex items-center justify-between text-slate-700 dark:text-slate-300 hover:border-orange-200 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isServer ? (
                          <Server className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : isDb ? (
                          <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : isIde ? (
                          <Code2 className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : isAi ? (
                          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                        ) : (
                          <Cpu className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{tool}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Assessment Preview Box */}
            <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-orange-500" />
                  <span>{isVi ? 'Tóm tắt đầu điểm' : 'Grading Scheme'}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('assessment')}
                  className="text-xs text-orange-500 hover:text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  {isVi ? 'Chi tiết' : 'Details'} &rarr;
                </button>
              </div>
              <div className="space-y-2.5">
                {syllabus.assessments.map((a: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{a.category}</span>
                      <Badge variant="orange" className="font-mono text-xs font-bold">
                        {a.weightPercent}%
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, a.weightPercent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Passing Criteria Card (Always visible to both Students and Lecturers) */}
            <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/10 shadow-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{isVi ? 'Điều kiện qua môn (Passing Criteria)' : 'Passing Criteria'}</span>
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Tham gia tối thiểu 80% tổng số buổi học trên lớp (Attendance >= 80%).' : 'Attend at least 80% of total class slots.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm thi thực hành Practical Exam (PE) phải đạt từ 4.0/10 trở lên.' : 'Practical Exam (PE) score must be at least 4.0/10.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm thi lý thuyết cuối kỳ Final Exam (FE) phải đạt từ 4.0/10 trở lên.' : 'Final Exam (FE) score must be at least 4.0/10.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isVi ? 'Điểm trung bình tổng kết môn học đạt từ 5.0/10 trở lên.' : 'Overall final course grade must be 5.0/10 or higher.'}</span>
                </li>
              </ul>
            </Card>

            {/* Lecturer Fast Hub Card */}
            {management && (
              <Card className="p-6 border-orange-500/20 bg-orange-50/30 dark:bg-orange-950/10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-500" />
                  <span>{isVi ? 'Tác vụ giảng viên' : 'Lecturer Hub'}</span>
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
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CLOS                                                  */}
      {/* ============================================================ */}
      {activeTab === 'clos' && (
        <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-500" />
                <span>{isVi ? 'Danh mục Chuẩn đầu ra môn học (Course Learning Outcomes)' : 'Course Learning Outcomes (CLOs)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isVi
                  ? 'Chi tiết các tiêu chuẩn năng lực và mục tiêu sinh viên cần đạt sau khi hoàn tất môn học'
                  : 'Detailed competence criteria expected upon course completion'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm kiếm CLO...' : 'Search CLO...'}
                  value={cloSearch}
                  onChange={(e) => setCloSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 rounded-xl"
                />
              </div>
              <Badge variant="orange" className="text-xs font-mono font-bold shrink-0">
                {syllabus.clos.length} CLOs
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 w-24 text-center">{isVi ? 'Mã CLO' : 'CLO Code'}</th>
                  <th className="p-3.5 w-28 text-center">{isVi ? 'Ánh xạ LO' : 'LO Mapping'}</th>
                  <th className="p-3.5 min-w-[320px]">{isVi ? 'Nội dung chuẩn đầu ra chi tiết' : 'Details'}</th>
                  <th className="p-3.5 w-36 text-center">{isVi ? 'Đánh giá qua' : 'Assessment'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredClos.map((clo: any, idx: number) => {
                  const cloNum = parseInt(clo.code.replace(/\D/g, '') || String(idx + 1))
                  const evalType = cloNum <= 2 ? 'PT, Workshop' : cloNum <= 6 ? 'Assignment, PE' : 'PE, FE'

                  return (
                    <tr key={idx} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/40">
                          {clo.code}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {clo.loDetails || clo.code.replace('CLO', 'LO')}
                      </td>
                      <td className="p-3.5 text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                        {clo.details}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {evalType}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SESSIONS                                              */}
      {/* ============================================================ */}
      {activeTab === 'sessions' && (
        <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span>{isVi ? 'Lịch trình bài giảng & Buổi học chi tiết' : 'Detailed Session Schedule'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isVi
                  ? `Kế hoạch toàn bộ ${syllabus.sessions.length} slot học, tài liệu giảng dạy và nhiệm vụ chuẩn bị`
                  : `Schedule of all ${syllabus.sessions.length} slots, materials and required student preparation`}
              </p>
            </div>

            <div className="w-full sm:w-80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm kiếm slot, chủ đề...' : 'Search slot, topic...'}
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">{isVi ? 'Lọc theo:' : 'Filter:'}</span>
            <button
              onClick={() => setSessionFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sessionFilter === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isVi ? 'Tất cả' : 'All'} ({syllabus.sessions.length})
            </button>
            <button
              onClick={() => setSessionFilter('lecture')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sessionFilter === 'lecture'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isVi ? 'Lý thuyết (Lecture)' : 'Lectures'}
            </button>
            <button
              onClick={() => setSessionFilter('lab')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sessionFilter === 'lab'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isVi ? 'Thực hành (Lab)' : 'Labs'}
            </button>
            <button
              onClick={() => setSessionFilter('exam')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sessionFilter === 'exam'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isVi ? 'Đánh giá & Thi' : 'Exams'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 w-16 text-center">Slot</th>
                  <th className="p-3.5 min-w-[260px]">{isVi ? 'Chủ đề bài học (Topic)' : 'Topic'}</th>
                  <th className="p-3.5 w-28 text-center">{isVi ? 'Hình thức' : 'Type'}</th>
                  <th className="p-3.5 w-24 text-center">CLO</th>
                  <th className="p-3.5 w-20 text-center" title="Introduce, Teach, Utilize">ITU</th>
                  <th className="p-3.5 min-w-[200px]">{isVi ? 'Nhiệm vụ sinh viên' : 'Student Tasks'}</th>
                  <th className="p-3.5 w-28 text-center">{isVi ? 'Tài liệu' : 'Materials'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isVi ? 'Không tìm thấy buổi học nào phù hợp với bộ lọc.' : 'No sessions match your filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((ses: any, idx: number) => {
                    const isOnline = ses.type.toLowerCase().includes('online') || ses.type.toLowerCase().includes('lab')
                    const isExam = ses.topic.toLowerCase().includes('exam') || ses.topic.toLowerCase().includes('evaluation')

                    return (
                      <tr key={idx} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-center font-mono font-bold text-orange-600 dark:text-orange-400">
                          #{ses.sessionNo}
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {ses.topic}
                          </p>
                          {ses.studentMaterials && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {ses.studentMaterials}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge
                            variant={isExam ? 'orange' : isOnline ? 'blue' : 'outline'}
                            className="text-[10px] font-semibold"
                          >
                            {ses.type}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-orange-600 dark:text-orange-400">
                          {ses.clo}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-500">
                          {ses.itu}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                          {ses.studentTasks}
                        </td>
                        <td className="p-3.5 text-center">
                          <a
                            href={ses.materialsDownloadUrl === '#' ? '#' : ses.materialsDownloadUrl}
                            target={ses.materialsDownloadUrl === '#' ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (ses.materialsDownloadUrl === '#') {
                                e.preventDefault()
                                alert(isVi ? 'Tài liệu học tập đang được đồng bộ từ FPT FLM.' : 'Material is syncing from FLM.')
                              }
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] h-7 px-2.5 rounded-lg border border-orange-200 dark:border-orange-900/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors font-bold shadow-2xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>{isVi ? 'Tải về' : 'Download'}</span>
                          </a>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 4: ASSESSMENT                                            */}
      {/* ============================================================ */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <Card className="p-6 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-orange-500" />
                  <span>{isVi ? 'Cơ cấu và Trọng số điểm số môn học' : 'Assessment Scheme & Weights'}</span>
                </h3>
                <Badge variant="orange" className="text-xs font-bold font-mono">
                  {isVi ? 'Tổng 100%' : 'Total 100%'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi
                  ? 'Bảng phân bổ tỷ lệ phần trăm các đầu điểm đánh giá quá trình và thi kết thúc môn học chuẩn FPT'
                  : 'Breakdown of continuous assessment and final exam score percentages'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {syllabus.assessments.map((a: any, idx: number) => {
                const catLower = a.category.toLowerCase()
                const isPractical = catLower.includes('practical') || catLower.includes('pe')
                const isFinal = catLower.includes('final') || catLower.includes('fe')
                const isAssign = catLower.includes('assignment')

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3.5 hover:border-orange-300 transition-all hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{a.category}</span>
                      <span className="font-mono font-black text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                        {a.weightPercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, a.weightPercent))}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isAssign
                        ? (isVi ? 'Dự án Web MVC hoàn chỉnh kết nối Database, chấm điểm tự động kết hợp AI code review và vấn đáp.' : 'Complete MVC web application with database connectivity, AI code review and Q&A defense.')
                        : isPractical
                        ? (isVi ? 'Lập trình thực hành trực tiếp trên máy trong 85 phút với NetBeans, Tomcat và SQL Server.' : 'Hands-on coding exam on computer (85 minutes) with NetBeans, Tomcat and SQL Server.')
                        : isFinal
                        ? (isVi ? 'Thi lý thuyết trắc nghiệm 60 phút trên hệ thống thi EOS FPT.' : 'Multiple-choice theoretical exam (60 minutes) on FPT EOS system.')
                        : (isVi ? `Chiếm ${a.weightPercent}% trong tổng điểm tổng kết môn học.` : `Accounts for ${a.weightPercent}% of the overall final grade.`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Passing Criteria Details */}
          <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/10 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{isVi ? 'Quy định & Điều kiện qua môn (Passing Criteria)' : 'Passing Criteria'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">{isVi ? 'Chuyên cần học phần:' : 'Attendance:'}</strong>
                  <span>{isVi ? 'Tham gia tối thiểu 80% tổng số buổi học trên lớp (Attendance >= 80%).' : 'Attend at least 80% of total class slots.'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">{isVi ? 'Thi thực hành (Practical Exam):' : 'Practical Exam:'}</strong>
                  <span>{isVi ? 'Điểm thi PE phải đạt tối thiểu từ 4.0/10 trở lên.' : 'Practical Exam (PE) score must be at least 4.0/10.'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">{isVi ? 'Thi cuối kỳ (Final Exam):' : 'Final Exam:'}</strong>
                  <span>{isVi ? 'Điểm thi lý thuyết FE phải đạt tối thiểu từ 4.0/10 trở lên.' : 'Final Exam (FE) score must be at least 4.0/10.'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">{isVi ? 'Điểm tổng kết môn học:' : 'Final Course Grade:'}</strong>
                  <span>{isVi ? 'Điểm trung bình tổng kết môn học đạt từ 5.0/10 trở lên.' : 'Overall final course grade must be 5.0/10 or higher.'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: ASSIGNMENTS (For Lecturer)                           */}
      {/* ============================================================ */}
      {management && activeTab === 'assignments' && (
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
  )
}
