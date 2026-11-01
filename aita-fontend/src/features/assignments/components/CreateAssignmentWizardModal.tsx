'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/providers/language-provider'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { aiApi } from '@/lib/api/modules/ai'
import { AssignmentAnalysisReview } from './AssignmentAnalysisReview'
import { distributeRubricPoints } from '@/utils/rubricPoints'
import {
  Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Send, Terminal, Award, FileText, Check, UploadCloud, RefreshCw, Loader2,
  BookOpen, Clock, Calendar, ShieldCheck, CheckCheck, FileCode, Wand2, X, FileArchive
} from 'lucide-react'

export interface CreateAssignmentWizardModalProps {
  isOpen: boolean
  onClose: () => void
  classes: any[]
  onSuccess: () => void
}

export interface TestCaseItem {
  questionId?: string
  entryFile?: string
  id: string
  input: string
  expectedOutput: string
  points: number
  isHidden: boolean
  comparisonMode: 'exact' | 'trim_whitespace' | 'flexible'
}

export interface RubricCriterionItem {
  browserProbe?: any
  sqlProbe?: any
  id: string
  name: string
  description: string
  maxPoints: number
  method: 'test_runner' | 'deterministic_rule' | 'ai_assessment' | 'hybrid'
  passCondition: string
  failCondition: string
  aiGuidance: string
  evidence?: string
  source?: string
  reviewNeeded?: boolean
}

const RUBRIC_PRESETS: Record<string, { label: string; desc: string; criteria: Omit<RubricCriterionItem, 'id'>[] }> = {
  oop: {
    label: 'Lập trình Hướng đối tượng (OOP)',
    desc: 'Phù hợp cho C++, Java, C# có class, method, đóng gói và kế thừa.',
    criteria: [
      {
        name: 'Đúng chức năng nghiệp vụ',
        description: 'Vượt qua các kịch bản test case chính theo yêu cầu đề bài',
        maxPoints: 4,
        method: 'test_runner',
        passCondition: 'Chạy đúng toàn bộ test case đầu vào chuẩn',
        failCondition: 'Sai logic đầu ra, không in đúng định dạng yêu cầu',
        aiGuidance: 'Kiểm tra xem sinh viên có hardcode output không và thuật toán có đúng yêu cầu.',
      },
      {
        name: 'Xử lý trường hợp biên & Ngoại lệ',
        description: 'Kiểm tra input rỗng, giá trị âm, trùng lặp hoặc null',
        maxPoints: 2,
        method: 'test_runner',
        passCondition: 'Bắt ngoại lệ hợp lý, không để crash hệ thống',
        failCondition: 'Gây crash hoặc lỗi runtime unhandled',
        aiGuidance: 'Xem xét cách xử lý try-catch và validate dữ liệu đầu vào.',
      },
      {
        name: 'Cấu trúc OOP & Thiết kế lớp',
        description: 'Áp dụng tính đóng gói, phân chia class/struct hợp lý',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Thuộc tính private/protected, có getter/setter, tuân thủ nguyên lý OOP',
        failCondition: 'Viết dồn code vào 1 hàm main duy nhất, phá vỡ tính đóng gói',
        aiGuidance: 'Đánh giá cấu trúc class, tính module hóa và khả năng tái sử dụng mã nguồn.',
      },
      {
        name: 'Quản lý bộ nhớ & Clean Code',
        description: 'Giải phóng bộ nhớ cấp phát động, đặt tên rõ ràng, format chuẩn',
        maxPoints: 2,
        method: 'hybrid',
        passCondition: 'Code sạch sẽ, định dạng chuẩn, giải phóng con trỏ đầy đủ không rò rỉ',
        failCondition: 'Rò rỉ bộ nhớ, đặt tên biến vô nghĩa, code rườm rà',
        aiGuidance: 'Chấm điểm tính dễ đọc, comment rõ ràng và quản lý bộ nhớ an toàn.',
      },
    ],
  },
  algorithm: {
    label: 'Cấu trúc Dữ liệu & Giải thuật',
    desc: 'Phù hợp cho môn CSD201, bài tập Linked List, Tree, Graph, Sorting.',
    criteria: [
      {
        name: 'Cấu trúc Dữ liệu tự cài đặt',
        description: 'Tự cài đặt struct/class (Node, List), con trỏ head/tail, không dùng STL',
        maxPoints: 2.5,
        method: 'ai_assessment',
        passCondition: 'Có Node, List, duy trì head/tail chính xác',
        failCondition: 'Dùng std::vector, std::list thay thế cấu trúc tự cài đặt',
        aiGuidance: 'Kiểm tra định nghĩa struct/class và tính đúng đắn của liên kết con trỏ.',
      },
      {
        name: 'Chức năng CRUD & Tìm kiếm',
        description: 'Thêm, xóa, tìm kiếm, hiển thị danh sách hoạt động chính xác',
        maxPoints: 2.5,
        method: 'test_runner',
        passCondition: 'Vượt qua các test case thêm, xóa, tìm kiếm theo ID',
        failCondition: 'Thao tác sai dữ liệu, làm đứt gãy liên kết danh sách',
        aiGuidance: 'Ưu tiên kết quả chạy test case thực tế.',
      },
      {
        name: 'Thuật toán Sắp xếp / Thao tác nâng cao',
        description: 'Cài đặt đúng thuật toán sắp xếp (Bubble sort, Quick sort...) theo yêu cầu',
        maxPoints: 2.5,
        method: 'hybrid',
        passCondition: 'Sắp xếp đúng thứ tự, xử lý tốt danh sách rỗng hoặc 1 phần tử',
        failCondition: 'Sai thứ tự hoặc làm mất phần tử khi hoán đổi',
        aiGuidance: 'Kiểm tra thuật toán sắp xếp và giải thích độ phức tạp O(n^2).',
      },
      {
        name: 'Quản lý bộ nhớ, Destructor & Validation',
        description: 'Destructor giải phóng node an toàn, kiểm tra dữ liệu đầu vào',
        maxPoints: 2.5,
        method: 'ai_assessment',
        passCondition: 'Có destructor xóa node, từ chối ID trùng hoặc GPA sai',
        failCondition: 'Rò rỉ bộ nhớ, truy cập con trỏ null hoặc crash runtime',
        aiGuidance: 'Đánh giá destructor, copy semantics và xử lý trường hợp biên.',
      },
    ],
  },
  database: {
    label: 'Cơ sở Dữ liệu & SQL',
    desc: 'Phù hợp cho bài tập môn DBI202, viết script truy vấn SQL.',
    criteria: [
      {
        name: 'Đúng kết quả truy vấn SQL',
        description: 'Kết quả bảng dữ liệu trả về khớp 100% với yêu cầu đề thi',
        maxPoints: 5,
        method: 'test_runner',
        passCondition: 'Kết quả đúng số dòng, số cột và thứ tự sắp xếp',
        failCondition: 'Sai dữ liệu hoặc thiếu điều kiện lọc WHERE',
        aiGuidance: 'So khớp output bảng kết quả thực thi.',
      },
      {
        name: 'Cú pháp & Tối ưu hóa truy vấn',
        description: 'Sử dụng JOIN, GROUP BY, subquery hợp lý, không dư thừa',
        maxPoints: 3,
        method: 'ai_assessment',
        passCondition: 'Truy vấn ngắn gọn, tối ưu, viết hoa từ khóa chuẩn SQL',
        failCondition: 'Tạo tích Descartes (Cartesian product) hoặc subquery lặp',
        aiGuidance: 'Đánh giá cấu trúc câu lệnh và tính tối ưu.',
      },
      {
        name: 'Ràng buộc & Toàn vẹn dữ liệu',
        description: 'Tuân thủ khóa chính, khóa ngoại và kiểu dữ liệu',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Đúng ràng buộc toàn vẹn',
        failCondition: 'Vi phạm ràng buộc',
        aiGuidance: 'Kiểm tra tính nhất quán.',
      },
    ],
  },
  web: {
    label: 'Ứng dụng Web & Fullstack (Next.js / Node.js)',
    desc: 'Phù hợp cho môn SDN302, PRJ301, bài tập Web Fullstack, REST API, Next.js, Prisma.',
    criteria: [
      {
        name: 'Authentication & Security',
        description: 'Đăng ký/đăng nhập/đăng xuất, hash mật khẩu, session/cookie an toàn, bảo vệ route',
        maxPoints: 2.0,
        method: 'ai_assessment',
        passCondition: 'Xác thực đầy đủ, hash mật khẩu chuẩn, không lộ passwordHash hay secrets',
        failCondition: 'Lưu plaintext password hoặc không bảo vệ route yêu cầu đăng nhập',
        aiGuidance: 'Kiểm tra bảo mật auth và middleware xác thực session.',
      },
      {
        name: 'Task CRUD & Validation',
        description: 'Tạo, đọc, cập nhật, xóa task; validate dữ liệu phía server; trạng thái rõ ràng',
        maxPoints: 2.0,
        method: 'ai_assessment',
        passCondition: 'Thực hiện đúng nghiệp vụ CRUD, validate server-side chặt chẽ',
        failCondition: 'Thiếu validation hoặc thao tác CRUD bị lỗi',
        aiGuidance: 'Đánh giá tính đúng đắn của logic xử lý task.',
      },
      {
        name: 'Team & Relational Data',
        description: 'Quản lý nhóm và thành viên, quan hệ User-Team-Task, kiểm tra quyền owner/member',
        maxPoints: 2.0,
        method: 'ai_assessment',
        passCondition: 'Phân quyền chuẩn, thành viên ngoài nhóm không truy cập được dữ liệu nhóm khác',
        failCondition: 'Lỗi truy cập chéo dữ liệu trái quyền (IDOR/Authorization bypass)',
        aiGuidance: 'Kiểm tra logic phân quyền giữa các tài khoản người dùng.',
      },
      {
        name: 'Database & API Architecture',
        description: 'Prisma schema, migrations, cấu trúc Route Handlers/API, HTTP status code chuẩn',
        maxPoints: 1.5,
        method: 'ai_assessment',
        passCondition: 'Schema chuẩn hóa có khóa ngoại, API trả mã lỗi HTTP 2xx/4xx/5xx nhất quán',
        failCondition: 'Lỗi migration, thiết kế schema thiếu ràng buộc',
        aiGuidance: 'Đánh giá cấu trúc thư mục, code API và Prisma schema.',
      },
      {
        name: 'UI/UX & Usability',
        description: 'Giao diện thân thiện, responsive, xử lý trạng thái loading/empty/error',
        maxPoints: 1.0,
        method: 'ai_assessment',
        passCondition: 'Giao diện hoàn chỉnh, có phản hồi khi tải dữ liệu hoặc lỗi',
        failCondition: 'Trang trắng hoặc crash khi tải dữ liệu',
        aiGuidance: 'Đánh giá trải nghiệm người dùng và thiết kế giao diện.',
      },
      {
        name: 'Testing, Documentation & Code Quality',
        description: 'Kiểm thử integration/unit test, tài liệu README, .env.example, không commit secrets',
        maxPoints: 1.5,
        method: 'ai_assessment',
        passCondition: 'Có kịch bản test có ý nghĩa, tài liệu hướng dẫn chạy chi tiết, clean code',
        failCondition: 'Không có hướng dẫn hoặc để lộ secret trong source code',
        aiGuidance: 'Đánh giá chất lượng tài liệu và kiểm thử.',
      },
    ],
  },
}

const formatLocalDateTime = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
}

export function CreateAssignmentWizardModal({
  isOpen,
  onClose,
  classes,
  onSuccess,
}: CreateAssignmentWizardModalProps) {
  const { t } = useLanguage()

  // 2 Bước tinh gọn: 1 = Thông tin & Đề bài, 2 = Cấu hình chấm (Test cases & Rubric)
  const [currentStep, setCurrentStep] = React.useState<1 | 2>(1)
  const [step2Tab, setStep2Tab] = React.useState<'testcases' | 'rubric'>('testcases')
  const [submitting, setSubmitting] = React.useState(false)

  // ─── BƯỚC 1: THÔNG TIN BÀI TẬP ──────────────────────────────────────────────
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [examFile, setExamFile] = React.useState<{ name: string; size: string; content?: string; rawFile?: File } | null>(null)
  const examFileInputRef = React.useRef<HTMLInputElement>(null)
  const [classId, setClassId] = React.useState('')
  const selectedClass = React.useMemo(() => classes.find(c => (c.id || c._id) === classId), [classes, classId])
  const [startDate, setStartDate] = React.useState<string>(() => formatLocalDateTime(new Date()))
  const [dueDate, setDueDate] = React.useState('')
  const [maxScore, setMaxScore] = React.useState<number>(10)
  const [allowResubmission, setAllowResubmission] = React.useState(true)
  const [maxAttempts, setMaxAttempts] = React.useState<number>(0)
  const [resubmissionPolicy, setResubmissionPolicy] = React.useState<'highest' | 'latest'>('highest')

  // Ngôn ngữ lập trình chính
  const [requiredLanguage, setRequiredLanguage] = React.useState('Unknown')
  const [runtimeLanguage, setRuntimeLanguage] = React.useState('Unknown')
  const [runtimeVersion, setRuntimeVersion] = React.useState('Chưa xác định môi trường')
  const [buildCommand, setBuildCommand] = React.useState('')
  const [runCommand, setRunCommand] = React.useState('')
  const [submissionType, setSubmissionType] = React.useState<'single_file' | 'project_archive'>('project_archive')
  const [allowedFormats, setAllowedFormats] = React.useState<string[]>(['.zip'])
  const [entryFile, setEntryFile] = React.useState('')
  const [directoryStructure, setDirectoryStructure] = React.useState('Dự án mã nguồn theo đề bài.')
  const [assignmentCategory, setAssignmentCategory] = React.useState<'standard' | 'sql' | 'multimodule'>('standard')

  // AI Analysis State
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(false)
  const [aiAnalyzingStep, setAiAnalyzingStep] = React.useState('')
  const [analysis, setAnalysis] = React.useState<any>(null)
  const [analysisAcknowledged, setAnalysisAcknowledged] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState('')
  const analysisRequest = React.useRef(0)

  // ─── BƯỚC 2: CẤU HÌNH CHẤM BÀI ───────────────────────────────────────────────
  const [testCases, setTestCases] = React.useState<TestCaseItem[]>([])
  const [selectedPresetKey, setSelectedPresetKey] = React.useState<string>('')
  const [rubricCriteria, setRubricCriteria] = React.useState<RubricCriterionItem[]>([])
  const sqlChecks = rubricCriteria.flatMap(rule => (rule.sqlProbe?.testCases || []).map((test: any) => ({...test, question: rule.name})))
  const browserChecks: any[] = analysis?.testSuites?.browser || []

  React.useEffect(() => { setAnalysisAcknowledged(false) }, [rubricCriteria, testCases, description, requiredLanguage, maxScore, classId])
  React.useEffect(() => {
    if (!isOpen) { analysisRequest.current++; setIsAiAnalyzing(false) }
  }, [isOpen])

  const [publishImmediately, setPublishImmediately] = React.useState(true)

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStartDate(formatLocalDateTime(new Date()))
    }
  }, [isOpen])

  // Sync Language & Auto Runtime Environment
  const handleLanguageChange = (lang: string) => {
    setRequiredLanguage(lang)
    setRuntimeLanguage(lang)
    if (['Kotlin', 'Dart', 'Swift', 'Go', 'Rust', 'PHP', 'Unknown'].includes(lang)) {
      setRuntimeVersion('Cần cấu hình runner phù hợp')
      setEntryFile(''); setBuildCommand(''); setRunCommand('')
      setAllowedFormats(['.zip']); setAssignmentCategory('standard')
    } else if (lang === 'C++') {
      setRuntimeVersion('GCC 11 (C++17)')
      setEntryFile('main.cpp')
      setBuildCommand('g++ -std=c++17 -Wall -Wextra -pedantic main.cpp -o main')
      setRunCommand('./main')
      setAllowedFormats(['.cpp', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'C') {
      setRuntimeVersion('GCC 11 (C17)')
      setEntryFile('main.c')
      setBuildCommand('gcc -O2 main.c -o main')
      setRunCommand('./main')
      setAllowedFormats(['.c', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'Java') {
      setRuntimeVersion('Java 17 (OpenJDK LTS)')
      setEntryFile('Main.java')
      setBuildCommand('javac Main.java')
      setRunCommand('java Main')
      setAllowedFormats(['.java', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'Python') {
      setRuntimeVersion('Python 3.11')
      setEntryFile('main.py')
      setBuildCommand('')
      setRunCommand('python3 main.py')
      setAllowedFormats(['.py', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'C#') {
      setRuntimeVersion('.NET 8 (LTS)')
      setEntryFile('Program.cs')
      setBuildCommand('dotnet build')
      setRunCommand('dotnet run')
      setAllowedFormats(['.cs', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'TypeScript') {
      setRuntimeVersion('Node.js 20 LTS (TypeScript)')
      setEntryFile('package.json')
      setBuildCommand('npm run build')
      setRunCommand('npm start')
      setAllowedFormats(['.ts', '.tsx', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'JavaScript') {
      setRuntimeVersion('Node.js 20 LTS')
      setEntryFile('package.json')
      setBuildCommand('')
      setRunCommand('node index.js')
      setAllowedFormats(['.js', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'SQL') {
      setRuntimeVersion('PostgreSQL 16')
      setEntryFile('solution.sql')
      setBuildCommand('')
      setRunCommand('')
      setAllowedFormats(['.sql'])
      setAssignmentCategory('sql')
    }
  }

  // Load preset
  const loadRubricPreset = (presetKey: string) => {
    setSelectedPresetKey(presetKey)
    const preset = RUBRIC_PRESETS[presetKey]
    if (preset) {
      setRubricCriteria(preset.criteria.map((c, idx) => ({ ...c, id: `rc-${Date.now()}-${idx}` })))
    }
  }

  // Calculate totals
  const totalRubricScore = React.useMemo(() => {
    return Number(rubricCriteria.reduce((sum, item) => sum + (Number(item.maxPoints) || 0), 0).toFixed(2))
  }, [rubricCriteria])

  const totalTestScore = React.useMemo(() => {
    return testCases.reduce((sum, item) => sum + (Number(item.points) || 0), 0)
  }, [testCases])

  // Distribute test points evenly
  const distributeTestCasePoints = () => {
    if (testCases.length === 0) return
    const targetPoints = maxScore
    const pointPerTest = Number((targetPoints / testCases.length).toFixed(1))
    setTestCases(testCases.map((tc, idx) => ({
      ...tc,
      points: idx === testCases.length - 1
        ? Number((targetPoints - pointPerTest * (testCases.length - 1)).toFixed(1))
        : pointPerTest,
    })))
  }

  // Add / Remove Test Cases
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: `tc-${Date.now()}`,
        input: '',
        expectedOutput: '',
        points: 2,
        isHidden: false,
        comparisonMode: 'trim_whitespace',
      },
    ])
  }

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(t => t.id !== id))
  }

  // Add / Remove Rubric Criterion
  const addCriterion = () => {
    setRubricCriteria([
      ...rubricCriteria,
      {
        id: `rc-${Date.now()}`,
        name: `Tiêu chí mới ${rubricCriteria.length + 1}`,
        description: 'Mô tả yêu cầu đánh giá tiêu chí...',
        maxPoints: 2.5,
        method: 'ai_assessment',
        passCondition: 'Đáp ứng đầy đủ yêu cầu nghiệp vụ',
        failCondition: 'Không đáp ứng yêu cầu hoặc logic sai',
        aiGuidance: 'Hướng dẫn AI đối chiếu mã nguồn cho tiêu chí này...',
      },
    ])
  }

  const removeCriterion = (id: string) => {
    setRubricCriteria(rubricCriteria.filter(r => r.id !== id))
  }

  // AI Auto Config Trigger
  const triggerAiAutoConfig = async (override?: { file?: File; text?: string }) => {
    const fileToUpload = override?.file || examFile?.rawFile
    const textToAnalyze = override?.text !== undefined ? override.text : (override?.file ? '' : description)

    if (!fileToUpload && !textToAnalyze.trim()) {
      alert('Vui lòng chọn file đề thi (PDF / Word) hoặc nhập mô tả bài tập để AI phân tích.')
      return
    }

    setIsAiAnalyzing(true)
    const requestId = ++analysisRequest.current
    setAnalysisError(''); setAnalysis(null); setAnalysisAcknowledged(false)
    setAiAnalyzingStep('Đang đọc tài liệu & trích xuất cấu trúc đề thi...')

    try {
      const formData = new FormData()
      if (fileToUpload) formData.append('file', fileToUpload)
      if (textToAnalyze) formData.append('description', textToAnalyze)
      if (!fileToUpload && title.trim()) formData.append('title', title.trim())
      if (classId) formData.append('classId', classId)
      formData.append('maxScore', String(maxScore))

      const res: any = await aiApi.autoConfigureAssignment(formData)
      if (requestId !== analysisRequest.current) return
      if (res) {
        const data = res.data || res.Data || res
        setAnalysis(data); setSelectedPresetKey('')
        if (data.suggestedTitle || data.title) setTitle(data.suggestedTitle || data.title)
        if (data.description) setDescription(data.description)
        if (data.maxScore) setMaxScore(Number(data.maxScore) || 10)

        const detectedLang = data.detectedLanguage || data.requiredLanguage || data.runtimeConfig?.language
        if (detectedLang) {
          handleLanguageChange(detectedLang)
        }
        if (data.runtimeConfig) {
          setRuntimeVersion(data.runtimeConfig.version || 'Cần cấu hình runner phù hợp')
          setBuildCommand(data.runtimeConfig.buildCommand || '')
          setRunCommand(data.runtimeConfig.runCommand || '')
          setAssignmentCategory(data.assignmentCategory || 'standard')
        }
        if (data.submissionFormat) {
          setSubmissionType(data.submissionFormat.submissionType || 'project_archive')
          setAllowedFormats(data.submissionFormat.allowedFormats || ['.zip'])
          setEntryFile(data.submissionFormat.entryFile || '')
          setDirectoryStructure(data.submissionFormat.directoryStructure || '')
        }
        setTestCases([]); setRubricCriteria([])
        setStep2Tab(data.testCases?.length || data.testSuites?.browser?.length ? 'testcases' : 'rubric')

        if (data.testCases && Array.isArray(data.testCases)) {
          setTestCases(data.testCases.map((tc: any, idx: number) => ({
            id: tc.id || `tc-ai-${Date.now()}-${idx}`,
            questionId: tc.questionId, entryFile: tc.entryFile,
            input: tc.input || tc.stdin || '',
            expectedOutput: tc.expectedOutput || tc.stdout || '',
            points: Number(tc.points ?? tc.weight ?? 0),
            isHidden: Boolean(tc.isHidden ?? tc.hidden),
            comparisonMode: tc.comparisonMode || 'trim_whitespace',
          })))
        }

        if (data.rubricCriteria && Array.isArray(data.rubricCriteria) && data.rubricCriteria.length > 0) {
          const extractedCriteria = data.rubricCriteria.map((rc: any, idx: number) => ({
            id: rc.id || `rc-ai-${Date.now()}-${idx}`,
            name: rc.name || rc.title || `Tiêu chí ${idx + 1}`,
            description: rc.description || '',
            maxPoints: Number(rc.maxPoints ?? rc.points ?? 0),
            method: rc.method || 'ai_assessment',
            passCondition: rc.passCondition || 'Đáp ứng đúng yêu cầu',
            failCondition: rc.failCondition || 'Chưa đạt yêu cầu',
            aiGuidance: rc.aiGuidance || 'Đối chiếu tiêu chí với bài nộp và nêu bằng chứng.',
            sqlProbe: rc.sqlProbe, browserProbe: rc.browserProbe, evidence: rc.evidence, source: rc.source, reviewNeeded: rc.reviewNeeded,
          }))
          const target = Number(data.maxScore) || maxScore
          const sum = extractedCriteria.reduce((total: number, criterion: RubricCriterionItem) => total + criterion.maxPoints, 0)
          setRubricCriteria(Math.abs(sum - target) > 0.001 ? distributeRubricPoints(extractedCriteria, target) : extractedCriteria)
        }
      }
    } catch (err: any) {
      if (requestId !== analysisRequest.current) return
      console.error('[AI Auto Config] Error:', err)
      setAnalysisError(err?.message || 'Không phân tích được đề bài. Vui lòng thử lại; cấu hình cũ chưa được xác nhận cho tệp này.')
    } finally {
      if (requestId === analysisRequest.current) { setIsAiAnalyzing(false); setAiAnalyzingStep('') }
    }
  }

  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
    const sizeKb = (file.size / 1024).toFixed(1)
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`

    setExamFile({ name: file.name, size: sizeStr, rawFile: file })
    triggerAiAutoConfig({ file })
  }

  // Handle Create / Publish
  const handleSaveAssignment = async (isPublishing: boolean) => {
    if (!title.trim()) {
      alert('Vui lòng nhập Tên bài tập.')
      setCurrentStep(1)
      return
    }
    if (!classId) {
      alert('Vui lòng chọn Lớp học phần.')
      setCurrentStep(1)
      return
    }
    if (isAiAnalyzing || analysisError) { alert('Cần hoàn tất hoặc thử lại phân tích trước khi lưu bài tập.'); return }
    if (isPublishing && (requiredLanguage === 'Unknown' || !rubricCriteria.length || Math.abs(totalRubricScore - Number(maxScore)) > .01)) {
      alert('Cần xác nhận ngôn ngữ và barem có tổng điểm đúng thang điểm trước khi giao bài.'); return
    }
    if (isPublishing && analysis && !analysisAcknowledged) { alert('Vui lòng đối chiếu đề gốc và xác nhận barem trước khi giao bài.'); return }
    if (isPublishing && rubricCriteria.some(rule => ['test_runner', 'hybrid'].includes(rule.method) && !testCases.length)) { alert('Tiêu chí Test tự động chưa có testcase thực thi. Hãy cấu hình kiểm thử hoặc chọn AI đánh giá code.'); return }

    setSubmitting(true)
    try {
      const isoDue = dueDate ? new Date(dueDate).toISOString() : undefined
      const isoStart = startDate ? new Date(startDate).toISOString() : undefined
      const status = isPublishing ? 'published' : 'draft'

      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        subjectId: selectedClass?.subject?.id || (selectedClass as any)?.subjectId || (selectedClass as any)?.SubjectId || '',
        classId: classId,
        classIds: [classId],
        status,
        sendNotification: isPublishing,
        startDate: isoStart,
        dueAt: isoDue,
        dueDate: isoDue,
        maxScore: Number(maxScore),
        totalPoints: Number(maxScore),
        allowResubmission,
        maxAttempts: allowResubmission ? (Number(maxAttempts) || 0) : 1,
        submissionFormat: {
          submissionType,
          allowedFormats,
          requiredLanguage,
          entryFile,
          directoryStructure,
          resubmissionPolicy,
          attachedPromptFile: examFile ? { name: examFile.name, size: examFile.size } : undefined,
        },
        runtimeConfig: {
          language: runtimeLanguage,
          version: runtimeVersion,
          submissionStyle: 'project_archive',
          buildCommand,
          runCommand,
          category: assignmentCategory,
          sandboxSafetyDefaults: {
            cpuTimeLimitSec: 2.0,
            memoryLimitMb: 256,
            networkAccess: false,
            isolatedContainer: true,
          },
        },
        testCases: testCases.map(tc => ({
          id: tc.id, questionId: tc.questionId, entryFile: tc.entryFile,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          points: Number(tc.points),
          isHidden: Boolean(tc.isHidden),
          comparisonMode: tc.comparisonMode,
        })),
        testSuites: analysis?.testSuites,
        rubricCriteria: rubricCriteria.map(rc => ({
          name: rc.name,
          description: rc.description,
          maxPoints: Number(rc.maxPoints),
          method: rc.method,
          passCondition: rc.passCondition,
          failCondition: rc.failCondition,
          aiGuidance: rc.aiGuidance,
          sqlProbe: rc.sqlProbe, browserProbe: rc.browserProbe, evidence: rc.evidence, source: rc.source,
        })),
        sqlConfig: analysis?.sqlConfig,
        aiConfig: {
          analysisReview: analysis ? { ...analysis.analysisReview, acknowledged: analysisAcknowledged } : undefined,
          acceptanceTests: analysis?.acceptanceTests,
          requirementGroups: analysis?.requirementGroups,
          documentHash: analysis?.provenanceReport?.documentHash,
          ragAutoIndexing: true,
          attachedPromptFile: examFile ? { name: examFile.name, size: examFile.size } : undefined,
        },
      }

      if (examFile?.rawFile) {
        const multipart = new FormData()
        multipart.append('payload', JSON.stringify(payload))
        multipart.append('file', examFile.rawFile)
        await assignmentsApi.createAssignment(multipart)
      } else {
        await assignmentsApi.createAssignment(payload)
      }

      if (isPublishing) {
        alert(`🎉 Đã giao bài tập "${title}" thành công cho lớp ${selectedClass?.classCode || selectedClass?.code || ''}! Sinh viên đã có thể xem đề và nộp bài.`)
      } else {
        alert(`Đã lưu bài tập "${title}" ở dạng Bản nháp thành công.`)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[CreateAssignment] Error:', err)
      alert(err?.message || 'Có lỗi xảy ra khi tạo bài tập. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Thiết lập & Giao bài tập mới</h3>
            <p className="text-xs text-slate-500 font-normal">Tự động cấu hình Sandbox và chấm điểm thông minh qua AI</p>
          </div>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="w-full space-y-6">

        {/* ─── THANH ĐIỀU HƯỚNG 2 BƯỚC TINH GỌN ─── */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentStep === 1
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/60 dark:border-orange-900/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
              currentStep === 1 ? 'bg-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              1
            </span>
            <span>Bước 1: Đề bài & Thông tin chung</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!title.trim() || !classId) {
                alert('Vui lòng nhập Tên bài tập và chọn Lớp học trước khi sang Bước 2.')
                return
              }
              setCurrentStep(2)
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentStep === 2
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/60 dark:border-orange-900/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
              currentStep === 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              2
            </span>
            <span>Bước 2: Barem điểm (Rubric) & Test Cases</span>
          </button>
        </div>

        {analysisError && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3 text-xs">{analysisError}</p>}
        <AssignmentAnalysisReview analysis={analysis} acknowledged={analysisAcknowledged} onAcknowledge={setAnalysisAcknowledged} />
        {/* ─── BƯỚC 1: ĐỀ BÀI & THÔNG TIN CHUNG ─── */}
        {currentStep === 1 && (
          <div className="space-y-5">

            {/* KHU VỰC TẢI LÊN ĐỀ THI & AI BÓC TÁCH */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-slate-50 dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-900 border border-orange-200/70 dark:border-orange-900/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tải đề bài để AI tự động điền cấu hình</h4>
                    <p className="text-xs text-slate-500">Tải tệp PDF hoặc DOCX để AI trích xuất tiêu đề, ngôn ngữ, test cases và barem điểm</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => triggerAiAutoConfig()}
                  disabled={isAiAnalyzing || (!examFile && !description.trim())}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5 shrink-0"
                >
                  {isAiAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAiAnalyzing ? 'Đang phân tích...' : 'AI Phân tích đề bài'}</span>
                </Button>
              </div>

              {/* Ô Drag & Drop Upload */}
              <input
                ref={examFileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleExamFileUpload}
                className="hidden"
              />

              <div
                onClick={() => examFileInputRef.current?.click()}
                className="border-2 border-dashed border-orange-300/80 dark:border-orange-800/60 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white/60 dark:bg-slate-900/40"
              >
                {examFile ? (
                  <div className="flex items-center justify-between px-3 py-1">
                    <div className="flex items-center gap-2 text-left">
                      <FileText className="w-6 h-6 text-orange-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">{examFile.name}</p>
                        <p className="text-[11px] text-slate-400">{examFile.size} • {isAiAnalyzing ? 'Đang đọc nội dung (PDF scan cần OCR)...' : analysisError ? 'Chưa đọc được nội dung' : analysis ? 'Đã phân tích — cần kiểm tra lại' : 'Đã chọn tệp'}</p>
                        {analysis?.provenanceReport?.scanNotice && <p className="text-xs text-amber-700">{analysis.provenanceReport.scanNotice}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); analysisRequest.current++; setExamFile(null); setRubricCriteria([]); setTestCases([]); handleLanguageChange('Unknown'); setAnalysis(null); setAnalysisAcknowledged(false); setIsAiAnalyzing(false); setAnalysisError('') }}
                      className="text-xs text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <UploadCloud className="w-7 h-7 text-orange-500" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bấm vào đây để chọn tệp đề thi <span className="text-orange-600 underline">PDF, Word (.docx)</span>
                    </p>
                    <p className="text-[11px] text-slate-400">Hệ thống sẽ tự động bóc tách bài toán và barem điểm trong vài giây</p>
                  </div>
                )}
              </div>

              {/* Thông báo tiến trình AI */}
              {isAiAnalyzing && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-100/70 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 text-xs animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-orange-600" />
                  <span>{aiAnalyzingStep || 'AI đang xử lý tài liệu đề thi...'}</span>
                </div>
              )}
            </div>

            {/* FORM THÔNG TIN CHÍNH */}
            <div className="space-y-4">
              {/* Tên bài tập */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên bài tập / Đề thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: CSD201 - Student Management Using Singly Linked List (C++)"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Grid 3 Cột: Lớp học - Ngôn ngữ - Điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp học phần <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((cls) => (
                      <option key={cls.id || cls._id} value={cls.id || cls._id}>
                        {cls.classCode || cls.code} ({cls.subjectCode || cls.subject?.code || 'Môn học'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngôn ngữ lập trình <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={requiredLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="Unknown">Chưa xác định — cần xác nhận</option>
                    <option value="Kotlin">Kotlin (Android)</option>
                    <option value="Dart">Dart (Flutter)</option>
                    <option value="Swift">Swift (iOS)</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                    <option value="PHP">PHP</option>
                    <option value="TypeScript">TypeScript (Node.js 20 / Next.js)</option>
                    <option value="JavaScript">JavaScript (Node.js 20 LTS)</option>
                    <option value="C++">C++ (C++17 - GCC Compiler)</option>
                    <option value="Java">Java (Java 17 OpenJDK)</option>
                    <option value="Python">Python (Python 3.11)</option>
                    <option value="C#">C# (.NET 8)</option>
                    <option value="C">C (C17 - GCC Compiler)</option>
                    <option value="SQL">SQL (PostgreSQL 16)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thang điểm tối đa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value) || 10)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Grid 2 Cột: Thời gian bắt đầu - Hạn nộp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian mở đề
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn chót nộp bài (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Mô tả & Yêu cầu đề bài */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mô tả và yêu cầu chi tiết đề bài <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    Hỗ trợ định dạng Markdown (Tiêu đề, danh sách, bảng, lưu ý...)
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả đề bài toán, yêu cầu kỹ thuật, các hàm cần cài đặt..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed font-mono"
                />
              </div>

              {/* Tùy chọn nộp bài gọn gàng */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowResubmit"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="allowResubmit" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Cho phép sinh viên nộp lại bài trước thời hạn (lấy điểm cao nhất)
                  </label>
                </div>
                <span className="text-[11px] text-slate-400">Sandbox: {runtimeVersion}</span>
              </div>
            </div>

            {/* Nút hành động Bước 1 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (!title.trim()) { alert('Vui lòng nhập Tên bài tập.'); return }
                  if (!classId) { alert('Vui lòng chọn Lớp học phần.'); return }
                  setCurrentStep(2)
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5 px-5"
              >
                <span>Tiếp tục: Cấu hình chấm điểm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

          </div>
        )}

        {/* ─── BƯỚC 2: CẤU HÌNH CHẤM BÀI (TEST CASES & RUBRIC) ─── */}
        {currentStep === 2 && (
          <div className="space-y-5">

            {/* Thanh chuyển đổi giữa Test Cases và Rubric */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep2Tab('testcases')}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    step2Tab === 'testcases'
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>1. Bộ kiểm thử tự động ({testCases.length + sqlChecks.length + browserChecks.length} tests)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep2Tab('rubric')}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    step2Tab === 'rubric'
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>2. Tiêu chí chấm Rubric ({rubricCriteria.length} tiêu chí)</span>
                </button>
              </div>

              {/* Badge Tổng điểm Rubric */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono border ${
                  totalRubricScore === maxScore
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                }`}>
                  Rubric: {totalRubricScore}/{maxScore} điểm
                </span>
              </div>
            </div>

            {testCases.length > 0 && !rubricCriteria.some(rule => rule.method === 'test_runner') && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">
                Đã có {testCases.length} testcase nhưng chưa có tiêu chí dùng phương thức Test tự động. Lưu testcase không đồng nghĩa chương trình đã được chạy kiểm thử. Hãy chọn phương thức chấm phù hợp trong tab Tiêu chí chấm Rubric; điểm vẫn tính theo barem, không cộng testcase thêm lần nữa.
              </div>
            )}

            {/* NỘI DUNG TAB 1: TEST CASES */}
            {step2Tab === 'testcases' && sqlChecks.length > 0 && <section className="space-y-3">
              <h4 className="font-semibold">Kiểm thử SQL Server trong Docker ({sqlChecks.length})</h4>
              <p className="text-xs text-slate-500">Mỗi bài nộp dùng database riêng từ dữ liệu gốc. So sánh kết quả truy vấn và kiểm tra thay đổi dữ liệu của procedure, trigger, UPDATE; không dùng stdin/stdout.</p>
              {sqlChecks.map((test: any) => <div key={test.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{test.id} · {test.question}</strong><p className="text-xs text-slate-500 mt-1">Chạy đúng file trả lời của câu; điểm dựa trên kết quả SQL thực tế.</p></div>)}
            </section>}
            {step2Tab === 'testcases' && browserChecks.length > 0 && <section className="space-y-3"><h4 className="font-semibold">Kiểm thử trình duyệt từ đề ({browserChecks.length})</h4><p className="text-xs text-slate-500">Các kịch bản sẽ chạy trên ứng dụng React của bài nộp; điểm tính theo tiêu chí đã liên kết. Đây là cấu hình, chưa phải kết quả chạy.</p>{browserChecks.map(test => <details key={test.id} className="rounded-xl border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-semibold">{test.id} · {test.name} · {test.steps.length} thao tác</summary><p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{test.evidence}</p></details>)}</section>}
            {step2Tab === 'testcases' && !sqlChecks.length && !browserChecks.length && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Danh sách kịch bản kiểm thử (Stdin / Stdout)</h4>
                    <p className="text-[11px] text-slate-500">Các cặp stdin/stdout được lưu cùng đề. Chỉ thực thi khi tiêu chí chọn Test tự động và Docker Sandbox đã sẵn sàng.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={distributeTestCasePoints} className="text-xs gap-1">
                      <RefreshCw className="w-3 h-3" /> Chia đều {maxScore}đ
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={addTestCase} className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1">
                      <Plus className="w-3.5 h-3.5" /> Thêm Test Case
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {testCases.length === 0 && (
                    <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3">
                      <span className="text-lg">🌐</span>
                      <div>
                        <p className="font-bold mb-1">Chưa có testcase thực thi được xác minh từ đề bài</p>
                        <p className="text-sky-700/80 dark:text-sky-400">
                          Với bài C/C++ hoặc console, dùng cặp Input/Expected output trong đề hoặc bấm Thêm Test Case. Với Android/Web/Desktop, cần môi trường kiểm thử phù hợp; không chuyển thao tác giao diện thành stdin/stdout.
                        </p>
                      </div>
                    </div>
                  )}

                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200/50">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {tc.questionId && `${tc.questionId} · ${tc.entryFile || ''} · `}{tc.isHidden ? 'Test Case Ẩn (Chống Hardcode)' : 'Test mẫu công khai'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTestCases(testCases.map(t => t.id === tc.id ? { ...t, isHidden: !t.isHidden } : t))
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                              tc.isHidden
                                ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {tc.isHidden ? 'Chuyển thành công khai' : 'Đặt làm test ẩn'}
                          </button>

                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-slate-500">Điểm:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.25}
                              value={tc.points}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                setTestCases(testCases.map(t => t.id === tc.id ? { ...t, points: val } : t))
                              }}
                              className="w-14 px-1.5 py-0.5 text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeTestCase(tc.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Đầu vào (Input / Stdin)
                          </label>
                          <textarea
                            rows={3}
                            value={tc.input}
                            onChange={(e) => {
                              const val = e.target.value
                              setTestCases(testCases.map(t => t.id === tc.id ? { ...t, input: val } : t))
                            }}
                            placeholder="Chuỗi gửi vào chương trình (vd: 2 3)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Kết quả mong đợi (Expected Output / Stdout)
                          </label>
                          <textarea
                            rows={3}
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const val = e.target.value
                              setTestCases(testCases.map(t => t.id === tc.id ? { ...t, expectedOutput: val } : t))
                            }}
                            placeholder="Đầu ra chương trình phải in ra (vd: 5)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NỘI DUNG TAB 2: RUBRIC CRITERIA */}
            {step2Tab === 'rubric' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Barem mẫu:</span>
                    <select
                      value={selectedPresetKey}
                      onChange={(e) => loadRubricPreset(e.target.value)}
                      className="max-w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                    >
                      <option value="web">Ứng dụng Web & Fullstack (Next.js / Node.js)</option>
                      <option value="algorithm">Cấu trúc dữ liệu & Giải thuật</option>
                      <option value="oop">Lập trình Hướng đối tượng (OOP)</option>
                      <option value="">Barem theo đề đã phân tích</option>
                      <option value="database">Cơ sở Dữ liệu & SQL</option>
                    </select>
                  </div>

                  <Button type="button" variant="outline" size="sm" disabled={!rubricCriteria.length} onClick={() => setRubricCriteria(distributeRubricPoints(rubricCriteria, maxScore))} className="text-xs gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Chia đều {maxScore} điểm
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={addCriterion} className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Thêm tiêu chí
                  </Button>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {rubricCriteria.map((rc, idx) => (
                    <div
                      key={rc.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 flex-1 mr-3">
                          <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={rc.name}
                            onChange={(e) => {
                              const val = e.target.value
                              setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, name: val } : r))
                            }}
                            className="font-bold text-xs text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:outline-none flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={rc.method}
                            onChange={(e) => {
                              const val = e.target.value as any
                              setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, method: val } : r))
                            }}
                            className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                          >
                            <option value="ai_assessment">{rc.sqlProbe ? 'SQL Server (Docker)' : rc.browserProbe?.testIds?.length ? 'Kiểm thử trình duyệt' : rc.browserProbe ? 'Đánh giá giao diện thực tế' : 'AI Đánh giá code'}</option>
                            <option value="test_runner">Test tự động</option>
                            <option value="hybrid">Động cơ lai (50/50)</option>
                          </select>

                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-slate-500">Điểm:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={rc.maxPoints}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, maxPoints: val } : r))
                              }}
                              className="w-14 px-1.5 py-0.5 text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCriterion(rc.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                            ✓ Điều kiện đạt chuẩn
                          </label>
                          <textarea
                            rows={2}
                            value={rc.passCondition}
                            onChange={(e) => {
                              const val = e.target.value
                              setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, passCondition: val } : r))
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-0.5">
                            ✕ Điều kiện chưa đạt / Trừ điểm
                          </label>
                          <textarea
                            rows={2}
                            value={rc.failCondition}
                            onChange={(e) => {
                              const val = e.target.value
                              setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, failCondition: val } : r))
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          💡 Hướng dẫn chi tiết cho AI phân tích
                        </label>
                        <input
                          type="text"
                          value={rc.aiGuidance}
                          onChange={(e) => {
                            const val = e.target.value
                            setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, aiGuidance: val } : r))
                          }}
                          placeholder="Chỉ dẫn cho AI cách đối chiếu code..."
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white text-xs"
                        />
                        {rc.evidence && <p className="mt-2 text-[11px] text-slate-500 whitespace-pre-wrap">Trích từ đề gốc: {rc.evidence}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nút hành động Bước 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setCurrentStep(1)} className="text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Bước 1</span>
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveAssignment(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Lưu bản nháp
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSaveAssignment(true)}
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5 px-6 font-bold shadow-md shadow-orange-500/20"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Đang lưu...' : 'Xuất bản & Giao bài ngay'}</span>
                </Button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  )
}
