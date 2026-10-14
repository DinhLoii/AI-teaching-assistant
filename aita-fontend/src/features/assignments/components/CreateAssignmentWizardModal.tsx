'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/providers/language-provider'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { aiApi } from '@/lib/api/modules/ai'
import {
  BookOpen, Calendar, Clock, CheckCircle2, AlertCircle, Plus, Trash2,
  Sparkles, Code2, Database, ShieldCheck, Cpu, Layers, FileCode,
  FileArchive, HelpCircle, Check, ArrowRight, ArrowLeft, Send, Eye,
  Sliders, Terminal, FileText, CheckSquare, RefreshCw, Wand2,
  Zap, Award, Lock, Unlock, UploadCloud, ChevronRight, Play, Server, FileCheck, CheckCheck,
  Loader2, ShieldAlert, Lightbulb, Bot,
} from 'lucide-react'

export interface CreateAssignmentWizardModalProps {
  isOpen: boolean
  onClose: () => void
  classes: any[]
  onSuccess: () => void
}

type MainStep = 1 | 2 | 3
type Step2SubTab = 'runtime' | 'testcases' | 'rubric' | 'ai'

export interface TestCaseItem {
  id: string
  input: string
  expectedOutput: string
  points: number
  isHidden: boolean
  comparisonMode: 'exact' | 'trim_whitespace' | 'flexible'
  source?: 'EXTRACTED' | 'RULE_INFERRED' | 'AI_SUGGESTED' | 'DEFAULT' | 'TEACHER_VERIFIED'
  evidence?: string
  notes?: string
}

export interface RubricCriterionItem {
  id: string
  name: string
  description: string
  maxPoints: number
  method: 'test_runner' | 'deterministic_rule' | 'ai_assessment' | 'hybrid'
  passCondition: string
  failCondition: string
  aiGuidance: string
  source?: 'EXTRACTED' | 'RULE_INFERRED' | 'AI_SUGGESTED' | 'DEFAULT' | 'TEACHER_VERIFIED'
  evidence?: string
  reviewNeeded?: boolean
  notes?: string
}

const RUBRIC_PRESETS: Record<string, { label: string; desc: string; criteria: Omit<RubricCriterionItem, 'id'>[] }> = {
  oop_java: {
    label: 'Lập trình Hướng đối tượng (OOP)',
    desc: 'Phù hợp cho Java, C++, C# có lớp đối tượng, kế thừa, đa hình và đóng gói.',
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
        failCondition: 'Gây ra NullPointerException hoặc lỗi runtime unhandled',
        aiGuidance: 'Xem xét cách xử lý try-catch và validate dữ liệu đầu vào.',
      },
      {
        name: 'Cấu trúc OOP & Thiết kế lớp',
        description: 'Áp dụng tính đóng gói, quan hệ kế thừa/giao diện, phân chia class hợp lý',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Các thuộc tính private/protected, có getter/setter, tuân thủ nguyên lý OOP',
        failCondition: 'Viết dồn code vào 1 hàm main duy nhất, phá vỡ tính đóng gói',
        aiGuidance: 'Đánh giá cấu trúc class, tính module hóa và khả năng tái sử dụng mã nguồn.',
      },
      {
        name: 'Khả năng bảo trì & Clean Code',
        description: 'Đặt tên biến/hàm chuẩn CamelCase, định dạng code sạch, có chú thích',
        maxPoints: 2,
        method: 'hybrid',
        passCondition: 'Code sạch sẽ, định dạng chuẩn, không có đoạn code chết hoặc lặp lại',
        failCondition: 'Tên biến vô nghĩa (a, b, x1), không thụt lề, code rườm rà',
        aiGuidance: 'Chấm điểm tính dễ đọc, comment rõ ràng và phong cách lập trình chuẩn.',
      },
    ],
  },
  algorithm_basic: {
    label: 'Thuật toán & Lập trình cơ bản',
    desc: 'Phù hợp cho bài tập nhập môn C++, Python, Java giải thuật.',
    criteria: [
      {
        name: 'Đúng chức năng & Kịch bản mẫu',
        description: 'Chạy đúng toàn bộ test case thông thường',
        maxPoints: 5,
        method: 'test_runner',
        passCondition: 'Đúng 100% test case công khai',
        failCondition: 'Sai kết quả đầu ra',
        aiGuidance: 'Kiểm tra tính đúng đắn của giải thuật chính.',
      },
      {
        name: 'Trường hợp biên & Hiệu năng test ẩn',
        description: 'Đáp ứng giới hạn thời gian (Time Limit) và bộ nhớ',
        maxPoints: 3,
        method: 'test_runner',
        passCondition: 'Vượt qua các test ẩn có kích thước mảng lớn',
        failCondition: 'Time Limit Exceeded hoặc tràn mảng / đệ quy vô tận',
        aiGuidance: 'Đánh giá độ phức tạp thuật toán O(n), O(n log n) so với yêu cầu.',
      },
      {
        name: 'Chất lượng code & Phong cách viết',
        description: 'Quy ước đặt tên biến, tách hàm rõ ràng, chú thích thuật toán',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Tách hàm logic độc lập, code mạch lạc dễ hiểu',
        failCondition: 'Code viết lộn xộn, dùng biến toàn cục bừa bãi',
        aiGuidance: 'Phân tích tính dễ đọc và phong cách viết mã.',
      },
    ],
  },
  database_sql: {
    label: 'Cơ sở dữ liệu & Truy vấn SQL',
    desc: 'Dành riêng cho bài tập truy vấn dữ liệu, DDL schema, thủ tục hoặc trigger.',
    criteria: [
      {
        name: 'Tính đúng đắn của kết quả truy vấn',
        description: 'Tập kết quả trả về khớp chính xác với dữ liệu mong đợi trên DB test',
        maxPoints: 5,
        method: 'test_runner',
        passCondition: 'Đúng cấu trúc cột và đúng các dòng dữ liệu',
        failCondition: 'Thiếu dòng, thừa dòng, nhầm phép JOIN',
        aiGuidance: 'So sánh bảng kết quả truy vấn sinh viên với kết quả mong đợi.',
      },
      {
        name: 'Tối ưu hóa truy vấn & Sử dụng Index',
        description: 'Dùng phép JOIN hợp lý, tránh SELECT * không cần thiết, dùng WHERE hiệu quả',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Truy vấn ngắn gọn, tối ưu, sử dụng GROUP BY/HAVING đúng chuẩn',
        failCondition: 'Dùng subquery lồng nhau không tối ưu gây Cartesian product',
        aiGuidance: 'Đánh giá chất lượng cú pháp SQL và độ tối ưu kế hoạch thực thi.',
      },
      {
        name: 'Ràng buộc & Tính toàn vẹn dữ liệu',
        description: 'Tuân thủ các ràng buộc khóa chính, khóa ngoại, kiểu dữ liệu',
        maxPoints: 2,
        method: 'hybrid',
        passCondition: 'Đúng ràng buộc quan hệ, kiểu dữ liệu phù hợp',
        failCondition: 'Vi phạm ràng buộc toàn vẹn',
        aiGuidance: 'Kiểm tra tính nhất quán của cấu trúc bảng hoặc script DDL.',
      },
      {
        name: 'Chuẩn phong cách viết SQL',
        description: 'Viết hoa từ khóa SQL (SELECT, FROM, WHERE), căn lề đẹp mắt',
        maxPoints: 1,
        method: 'deterministic_rule',
        passCondition: 'Từ khóa viết hoa, format dễ đọc',
        failCondition: 'Viết trên 1 dòng dài ngoằng không format',
        aiGuidance: 'Kiểm tra tính thẩm mỹ và chuẩn mực viết câu lệnh SQL.',
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

  // Steps
  const [currentStep, setCurrentStep] = React.useState<MainStep>(1)
  const [subTab, setSubTab] = React.useState<Step2SubTab>('runtime')
  const [submitting, setSubmitting] = React.useState(false)

  // ─── BƯỚC 1: THÔNG TIN BÀI TẬP ──────────────────────────────────────────────
  // 1.1 Thông tin chung
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [examFile, setExamFile] = React.useState<{ name: string; size: string; content?: string; rawFile?: File } | null>(null)
  const examFileInputRef = React.useRef<HTMLInputElement>(null)
  const [classId, setClassId] = React.useState('')
  const selectedClass = React.useMemo(() => classes.find(c => (c.id || c._id) === classId), [classes, classId])
  const [startDate, setStartDate] = React.useState<string>(() => formatLocalDateTime(new Date()))
  const [dueDate, setDueDate] = React.useState('')

  // Khi mở modal tạo bài tập, tự động thiết lập thời gian bắt đầu là thời điểm hiện tại
  React.useEffect(() => {
    if (isOpen) {
      setStartDate(formatLocalDateTime(new Date()))
    }
  }, [isOpen])
  const [maxScore, setMaxScore] = React.useState<number>(10)
  const [allowResubmission, setAllowResubmission] = React.useState(true)
  const [maxAttempts, setMaxAttempts] = React.useState<number>(0) // 0 = Không giới hạn
  const [resubmissionPolicy, setResubmissionPolicy] = React.useState<'highest' | 'latest'>('highest')

  // 1.0 Chế độ cấu hình: 'auto' (AI Tự cấu hình - Khuyên dùng mặc định) hoặc 'manual'
  const [aiConfigMode, setAiConfigMode] = React.useState<'auto' | 'manual'>('auto')
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(false)
  const [aiAnalyzingStep, setAiAnalyzingStep] = React.useState('')
  const [aiProposal, setAiProposal] = React.useState<any | null>(null)
  const [aiApiKeyError, setAiApiKeyError] = React.useState<string | null>(null)

  // 1.2 Yêu cầu nộp bài
  const [submissionType, setSubmissionType] = React.useState<'single_file' | 'project_archive'>('project_archive')
  const [allowedFormats, setAllowedFormats] = React.useState<string[]>(['.java', '.zip'])
  const [customFormatInput, setCustomFormatInput] = React.useState('')
  const [requiredLanguage, setRequiredLanguage] = React.useState('Java')
  const [isLanguageUserSelected, setIsLanguageUserSelected] = React.useState(false)
  const [entryFile, setEntryFile] = React.useState('Main.java')
  const [directoryStructure, setDirectoryStructure] = React.useState('Dự án ZIP chứa Main.java và các lớp đối tượng liên quan.')

  // ─── BƯỚC 2: CẤU HÌNH CHẤM BÀI ───────────────────────────────────────────────
  // 2.1 Môi trường và cách chạy code
  const [runtimeLanguage, setRuntimeLanguage] = React.useState('Java')
  const [runtimeVersion, setRuntimeVersion] = React.useState('Java 17 (OpenJDK LTS)')
  const [submissionStyle, setSubmissionStyle] = React.useState<'single_file' | 'multi_file' | 'project_archive'>('project_archive')
  const [buildCommand, setBuildCommand] = React.useState('javac Main.java')
  const [runCommand, setRunCommand] = React.useState('java Main')
  const [assignmentCategory, setAssignmentCategory] = React.useState<'standard' | 'sql' | 'multimodule'>('standard')

  // Riêng SQL/Database
  const [sqlDbms, setSqlDbms] = React.useState<'postgresql' | 'mysql' | 'sqlserver' | 'sqlite'>('postgresql')
  const [sqlSchemaDdl, setSqlSchemaDdl] = React.useState('')
  const [sqlSeedData, setSqlSeedData] = React.useState('')
  const [sqlExpectedQuery, setSqlExpectedQuery] = React.useState('')
  const [sqlComparisonMode, setSqlComparisonMode] = React.useState<'exact' | 'ignore_order' | 'structure_and_data'>('ignore_order')
  const [sqlConstraintsNotes, setSqlConstraintsNotes] = React.useState('')

  // 2.2 Test cases
  const [testCases, setTestCases] = React.useState<TestCaseItem[]>([
    {
      id: 'tc-1',
      input: '2 3',
      expectedOutput: '5',
      points: 1,
      isHidden: false,
      comparisonMode: 'trim_whitespace',
    },
    {
      id: 'tc-2',
      input: '-2 5',
      expectedOutput: '3',
      points: 1,
      isHidden: false,
      comparisonMode: 'trim_whitespace',
    },
    {
      id: 'tc-3',
      input: '0 0',
      expectedOutput: '0',
      points: 2,
      isHidden: true,
      comparisonMode: 'trim_whitespace',
    },
  ])
  const [bulkInputText, setBulkInputText] = React.useState('')
  const [showBulkModal, setShowBulkModal] = React.useState(false)

  // 2.3 Rubric
  const [selectedPresetKey, setSelectedPresetKey] = React.useState<string>('oop_java')
  const [rubricCriteria, setRubricCriteria] = React.useState<RubricCriterionItem[]>(
    RUBRIC_PRESETS.oop_java.criteria.map((c, idx) => ({ ...c, id: `rc-${idx + 1}` }))
  )

  // 2.4 Cấu hình AI & Nguồn kiến thức
  const [referenceMaterials, setReferenceMaterials] = React.useState('')
  const [sampleSolution, setSampleSolution] = React.useState('')
  const [commonPitfalls, setCommonPitfalls] = React.useState('')
  const [aiScope, setAiScope] = React.useState({
    logic: true,
    codeQuality: true,
    maintainability: true,
    edgeCases: true,
    specCompliance: true,
  })

  // ─── XEM TRƯỚC VÀ PHÁT HÀNH ──────────────────────────────────────────────────
  const [publishImmediately, setPublishImmediately] = React.useState(true)
  const [previewTab, setPreviewTab] = React.useState<'student' | 'system'>('student')

  // Áp dụng cấu hình do AI đề xuất vào các trường form
  const applyAiProposal = (raw: any) => {
    if (!raw) return
    const data = raw.data || raw.Data || raw

    const suggestedTitle = data.suggestedTitle || data.title
    if (suggestedTitle) {
      setTitle(suggestedTitle)
    }

    if (data.description) {
      setDescription(data.description)
    } else if (Array.isArray(data.requirements) && data.requirements.length > 0) {
      setDescription(`Yêu cầu bài tập:\n${data.requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`)
    }

    if (data.provenanceReport?.statedTotalPoints) {
      setMaxScore(Number(data.provenanceReport.statedTotalPoints))
    } else if (data.maxScore) {
      setMaxScore(Number(data.maxScore) || 10)
    }

    const lang = data.detectedLanguage || data.requiredLanguage || data.runtimeConfig?.language || data.submissionFormat?.requiredLanguage
    if (lang) {
      handleLanguageChange(lang)
    }

    const subType = data.submissionFormat?.submissionType || data.submissionType || data.runtimeConfig?.submissionStyle
    if (subType) {
      setSubmissionType(subType)
      setSubmissionStyle(subType)
    }

    const formats = data.submissionFormat?.allowedFormats || data.allowedFormats
    if (formats && Array.isArray(formats) && formats.length > 0) {
      setAllowedFormats(formats)
    }

    const entry = data.submissionFormat?.entryFile || data.entryFile
    if (entry) setEntryFile(entry)

    const dirStruct = data.submissionFormat?.directoryStructure || data.directoryStructure
    if (dirStruct) setDirectoryStructure(dirStruct)

    if (data.runtimeConfig?.version) {
      setRuntimeVersion(data.runtimeConfig.version)
    }

    if (data.runtimeConfig?.language) {
      setRuntimeLanguage(data.runtimeConfig.language)
    }

    const bCmd = data.runtimeConfig?.buildCommand !== undefined ? data.runtimeConfig.buildCommand : data.buildCommand
    if (bCmd !== undefined) setBuildCommand(bCmd)

    const rCmd = data.runtimeConfig?.runCommand || data.runCommand
    if (rCmd) setRunCommand(rCmd)

    const cat = data.assignmentCategory || data.runtimeConfig?.category
    if (cat) setAssignmentCategory(cat)

    if (data.testCases && Array.isArray(data.testCases) && data.testCases.length > 0) {
      setTestCases(
        data.testCases.map((tc: any, idx: number) => ({
          id: tc.id || `tc-ai-${Date.now()}-${idx}`,
          input: String(tc.input ?? ''),
          expectedOutput: String(tc.expectedOutput ?? ''),
          points: Number(tc.points) || 1,
          isHidden: !!tc.isHidden,
          comparisonMode: tc.comparisonMode || 'trim_whitespace',
          source: tc.source,
          evidence: tc.evidence,
          notes: tc.notes,
        }))
      )
    }

    if (data.rubricCriteria && Array.isArray(data.rubricCriteria) && data.rubricCriteria.length > 0) {
      setRubricCriteria(
        data.rubricCriteria.map((rc: any, idx: number) => ({
          id: rc.id || `rc-ai-${Date.now()}-${idx}`,
          name: rc.name || `Tiêu chí ${idx + 1}`,
          description: rc.description || '',
          maxPoints: Number(rc.maxPoints) || 2,
          method: rc.method || 'ai_assessment',
          passCondition: rc.passCondition || '',
          failCondition: rc.failCondition || '',
          aiGuidance: rc.aiGuidance || '',
          source: rc.source,
          evidence: rc.evidence,
          reviewNeeded: !!rc.reviewNeeded,
          notes: rc.notes,
        }))
      )
    }

    const refMat = data.edgeCasesAndPitfalls?.referenceMaterials || data.referenceMaterials
    if (refMat) setReferenceMaterials(refMat)

    const pitfalls = data.edgeCasesAndPitfalls?.commonPitfalls || data.commonPitfalls
    if (pitfalls) setCommonPitfalls(pitfalls)

    if (data.sampleSolution) setSampleSolution(data.sampleSolution)

    if (data.sqlConfig) {
      setAssignmentCategory('sql')
      if (data.sqlConfig.dbms) setSqlDbms(data.sqlConfig.dbms)
      if (data.sqlConfig.schemaDdl) setSqlSchemaDdl(data.sqlConfig.schemaDdl)
      if (data.sqlConfig.seedData) setSqlSeedData(data.sqlConfig.seedData)
      if (data.sqlConfig.expectedQuery) setSqlExpectedQuery(data.sqlConfig.expectedQuery)
    }
  }

  // Kích hoạt AI phân tích đề bài và đề xuất toàn diện cấu hình
  const triggerAiAutoConfig = async (override?: { file?: File; text?: string }) => {
    const fileToUpload = override?.file || examFile?.rawFile
    // Khi upload file mới, không dùng lại description cũ của bài trước để tránh làm AI bị nhầm đề
    const textToAnalyze = override?.text !== undefined ? override.text : (override?.file ? '' : description)

    if (!fileToUpload && !textToAnalyze.trim()) {
      alert('Vui lòng nhập nội dung mô tả đề bài hoặc tải lên file đề thi (PDF / Word / TXT) để AI có cơ sở phân tích cấu hình.')
      return
    }

    setIsAiAnalyzing(true)
    setAiAnalyzingStep('Đang đọc và giải mã nội dung đề thi...')
    setAiProposal(null)
    setAiApiKeyError(null)

    const timer1 = setTimeout(() => {
      setAiAnalyzingStep('Đang phân tích cú pháp, ngôn ngữ lập trình & kiểu nộp bài...')
    }, 1200)
    const timer2 = setTimeout(() => {
      setAiAnalyzingStep('Đang thiết kế bộ test cases & nhận diện trường hợp biên...')
    }, 2600)
    const timer3 = setTimeout(() => {
      setAiAnalyzingStep('Đang chuẩn hóa Rubric 10 điểm & tổng hợp các bẫy lỗi thường gặp...')
    }, 4200)

    try {
      const formData = new FormData()
      if (fileToUpload) {
        formData.append('file', fileToUpload)
      }
      if (textToAnalyze) {
        formData.append('description', textToAnalyze)
      }
      if (title.trim()) {
        formData.append('title', title.trim())
      }
      if (maxScore) {
        formData.append('maxScore', String(maxScore))
      }
      if (classId) {
        formData.append('classId', classId)
      }
      if (selectedClass) {
        const sCode = selectedClass.subjectCode || selectedClass.subject?.code || selectedClass.Subject?.Code || ''
        const sName = selectedClass.subjectName || selectedClass.subject?.name || selectedClass.Subject?.Name || selectedClass.name || ''
        if (sCode) formData.append('subjectCode', sCode)
        if (sName) formData.append('subjectName', sName)
      }
      // Gửi preferredLanguage chỉ khi người dùng đã chủ động chọn ngôn ngữ trên giao diện
      if (isLanguageUserSelected && requiredLanguage) {
        formData.append('preferredLanguage', requiredLanguage)
      }
      if (assignmentCategory) {
        formData.append('category', assignmentCategory)
      }

      const res: any = await aiApi.autoConfigureAssignment(formData)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)

      if (res) {
        const payload = res.data || res.Data || res
        setAiProposal(payload)
        applyAiProposal(payload)
      } else {
        throw new Error('Không nhận được dữ liệu cấu hình từ AI.')
      }
    } catch (err: any) {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      console.error('[AI Auto Config] Error:', err)
      const errorMsg = err?.message || String(err)
      const isKeyExpired =
        err?.code === 'AI_API_KEY_EXPIRED' ||
        err?.status === 401 ||
        /invalid_api_key|expired_api_key|api_key_invalid|hết hạn|không hợp lệ/i.test(errorMsg)

      if (isKeyExpired) {
        setAiApiKeyError(errorMsg)
      } else {
        alert(errorMsg || 'Có lỗi khi AI phân tích đề bài. Vui lòng kiểm tra lại file hoặc nhập thêm mô tả.')
      }
    } finally {
      setIsAiAnalyzing(false)
      setAiAnalyzingStep('')
    }
  }

  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
    const sizeKb = (file.size / 1024).toFixed(1)
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`

    const isTextOrCode = /\.(txt|md|c|cpp|h|hpp|java|py|cs|sql|js|ts|json)$/i.test(file.name)
    if (isTextOrCode) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = (event.target?.result as string) || ''
        setExamFile({ name: file.name, size: sizeStr, content: text, rawFile: file })
        if (!description.trim() && text) {
          setDescription(text.slice(0, 3000))
        }
        if (aiConfigMode === 'auto') {
          triggerAiAutoConfig({ file, text })
        }
      }
      reader.readAsText(file)
    } else {
      setExamFile({ name: file.name, size: sizeStr, rawFile: file })
      if (aiConfigMode === 'auto') {
        triggerAiAutoConfig({ file })
      }
    }
  }

  // Sync language selection between Step 1 and Step 2
  const handleLanguageChange = (lang: string, fromUser: boolean = false) => {
    if (fromUser) setIsLanguageUserSelected(true)
    setRequiredLanguage(lang)
    setRuntimeLanguage(lang)
    if (lang === 'C') {
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
      if (!allowedFormats.includes('.java')) setAllowedFormats([...allowedFormats, '.java', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'Python') {
      setRuntimeVersion('Python 3.11')
      setEntryFile('main.py')
      setBuildCommand('')
      setRunCommand('python main.py')
      setAllowedFormats(['.py', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'C++') {
      setRuntimeVersion('GCC 11 (C++17)')
      setEntryFile('main.cpp')
      setBuildCommand('g++ -O2 main.cpp -o main')
      setRunCommand('./main')
      setAllowedFormats(['.cpp', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'SQL') {
      setRuntimeVersion('PostgreSQL 16')
      setEntryFile('solution.sql')
      setBuildCommand('')
      setRunCommand('')
      setAllowedFormats(['.sql'])
      setAssignmentCategory('sql')
      loadRubricPreset('database_sql')
    } else if (lang === 'C#') {
      setRuntimeVersion('.NET 8 (LTS)')
      setEntryFile('Program.cs')
      setBuildCommand('dotnet build')
      setRunCommand('dotnet run')
      setAllowedFormats(['.cs', '.zip'])
      setAssignmentCategory('standard')
    } else if (lang === 'JavaScript' || lang === 'TypeScript') {
      setRuntimeVersion('Node.js 20 LTS')
      setEntryFile(lang === 'TypeScript' ? 'index.ts' : 'index.js')
      setBuildCommand(lang === 'TypeScript' ? 'tsc' : '')
      setRunCommand('node dist/index.js')
      setAllowedFormats(['.js', '.ts', '.zip'])
      setAssignmentCategory('standard')
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

  // Calculate rubric total
  const totalRubricScore = React.useMemo(() => {
    return rubricCriteria.reduce((sum, item) => sum + (Number(item.maxPoints) || 0), 0)
  }, [rubricCriteria])

  // Distribute test case points evenly
  const distributeTestCasePoints = () => {
    if (testCases.length === 0) return
    const totalPointsForTests = rubricCriteria
      .filter(r => r.method === 'test_runner' || r.method === 'hybrid')
      .reduce((sum, r) => sum + Number(r.maxPoints), 0) || maxScore

    const pointPerTest = Number((totalPointsForTests / testCases.length).toFixed(1))
    setTestCases(testCases.map((tc, idx) => ({
      ...tc,
      points: idx === testCases.length - 1
        ? Number((totalPointsForTests - pointPerTest * (testCases.length - 1)).toFixed(1))
        : pointPerTest,
    })))
  }

  // Format toggles
  const toggleFormat = (fmt: string) => {
    if (allowedFormats.includes(fmt)) {
      if (allowedFormats.length > 1) {
        setAllowedFormats(allowedFormats.filter(f => f !== fmt))
      }
    } else {
      setAllowedFormats([...allowedFormats, fmt])
    }
  }

  const addCustomFormat = () => {
    let clean = customFormatInput.trim()
    if (!clean) return
    if (!clean.startsWith('.')) clean = '.' + clean
    if (!allowedFormats.includes(clean)) {
      setAllowedFormats([...allowedFormats, clean])
    }
    setCustomFormatInput('')
  }

  // Add new test case
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: `tc-${Date.now()}`,
        input: '',
        expectedOutput: '',
        points: 1,
        isHidden: false,
        comparisonMode: 'trim_whitespace',
      },
    ])
  }

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(t => t.id !== id))
  }

  // Add new rubric criterion
  const addCriterion = () => {
    setRubricCriteria([
      ...rubricCriteria,
      {
        id: `rc-${Date.now()}`,
        name: `Tiêu chí mới ${rubricCriteria.length + 1}`,
        description: 'Mô tả yêu cầu đánh giá tiêu chí...',
        maxPoints: 2,
        method: 'ai_assessment',
        passCondition: 'Đáp ứng đầy đủ yêu cầu',
        failCondition: 'Không đáp ứng yêu cầu',
        aiGuidance: 'Hướng dẫn AI phân tích mã nguồn cho tiêu chí này...',
      },
    ])
  }

  const removeCriterion = (id: string) => {
    setRubricCriteria(rubricCriteria.filter(r => r.id !== id))
  }

  // Handle Bulk Test Case Parsing
  const handleBulkImport = () => {
    if (!bulkInputText.trim()) {
      setShowBulkModal(false)
      return
    }
    // Expected format: blocks separated by '---' or pairs of lines
    const blocks = bulkInputText.split('---').map(b => b.trim()).filter(Boolean)
    const newCases: TestCaseItem[] = []
    blocks.forEach((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length >= 2) {
        newCases.push({
          id: `bulk-${Date.now()}-${index}`,
          input: lines[0].replace(/^in(put)?:\s*/i, ''),
          expectedOutput: lines.slice(1).join('\n').replace(/^out(put)?:\s*/i, ''),
          points: 1,
          isHidden: index >= 2,
          comparisonMode: 'trim_whitespace',
        })
      }
    })
    if (newCases.length > 0) {
      setTestCases([...testCases, ...newCases])
    }
    setBulkInputText('')
    setShowBulkModal(false)
  }

  // Handle form submission
  const handleCreateAssignment = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên bài tập.')
      setCurrentStep(1)
      return
    }
    if (!classId) {
      alert('Vui lòng chọn lớp học.')
      setCurrentStep(1)
      return
    }

    setSubmitting(true)
    try {
      const isoDue = dueDate ? new Date(dueDate).toISOString() : undefined
      const isoStart = startDate ? new Date(startDate).toISOString() : undefined
      const status = publishImmediately ? 'published' : 'draft'

      // Payload construction
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        subjectId: selectedClass?.subject?.id || (selectedClass as any)?.subjectId || (selectedClass as any)?.SubjectId || (typeof selectedClass?.subject === 'string' ? selectedClass.subject : '') || '',
        classId: classId,
        classIds: classId ? [classId] : [],
        status,
        sendNotification: publishImmediately,
        startDate: isoStart,
        dueAt: isoDue,
        dueDate: isoDue,
        maxScore: Number(maxScore),
        totalPoints: Number(maxScore),
        allowResubmission,
        maxAttempts: allowResubmission ? (Number(maxAttempts) || 0) : 1,
        // Detailed submission format metadata
        submissionFormat: {
          submissionType,
          allowedFormats,
          requiredLanguage,
          entryFile,
          directoryStructure,
          resubmissionPolicy,
          attachedPromptFile: examFile ? { name: examFile.name, size: examFile.size } : undefined,
        },
        // 2.1 Runtime configuration
        runtimeConfig: {
          language: runtimeLanguage,
          version: runtimeVersion,
          submissionStyle,
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
        // Riêng SQL configuration nếu có
        sqlConfig: assignmentCategory === 'sql' ? {
          dbms: sqlDbms,
          schemaDdl: sqlSchemaDdl,
          seedData: sqlSeedData,
          expectedQuery: sqlExpectedQuery,
          comparisonMode: sqlComparisonMode,
          constraintsNotes: sqlConstraintsNotes,
        } : undefined,
        // 2.2 Test cases
        testCases: testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          points: Number(tc.points),
          isHidden: Boolean(tc.isHidden),
          comparisonMode: tc.comparisonMode,
        })),
        // 2.3 Rubric criteria
        rubricCriteria: rubricCriteria.map(rc => ({
          name: rc.name,
          description: rc.description,
          maxPoints: Number(rc.maxPoints),
          method: rc.method,
          passCondition: rc.passCondition,
          failCondition: rc.failCondition,
          aiGuidance: rc.aiGuidance,
        })),
        // 2.4 AI configuration & knowledge reference
        aiConfig: {
          referenceMaterials: referenceMaterials.trim(),
          commonPitfalls: commonPitfalls.trim(),
          scope: aiScope,
          ragAutoIndexing: true,
          attachedPromptFile: examFile ? { name: examFile.name, size: examFile.size } : undefined,
        },
        sampleSolution: sampleSolution.trim() || undefined,
      }

      await assignmentsApi.createAssignment(payload)

      if (publishImmediately) {
        alert(`🎉 Đã tạo và giao bài tập "${title}" thành công cho lớp ${selectedClass?.classCode || selectedClass?.code}! Sinh viên đã có thể xem đề và nộp bài.`)
      } else {
        alert(`Đã lưu bài tập "${title}" ở trạng thái Bản nháp. Bạn có thể vào Workspace để điều chỉnh và bấm Giao bài sau.`)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[CreateAssignment] Error:', err)
      alert(err?.message || 'Có lỗi xảy ra khi tạo bài tập. Vui lòng kiểm tra lại cấu hình.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thiết lập & Tạo bài tập mới</h3>
            <p className="text-xs text-slate-500 font-normal">Hỗ trợ tự động chạy test sandbox & RAG AI chấm mã nguồn chuẩn xác</p>
          </div>
        </div>
      }
      maxWidth="6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: WIZARD FORM */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Step Indicator */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                currentStep === 1
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/60 dark:border-orange-900/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${currentStep === 1 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>1</span>
              Bước 1: Thông tin bài tập
            </button>

            <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                currentStep === 2
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/60 dark:border-orange-900/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${currentStep === 2 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>2</span>
              Bước 2: Cấu hình chấm bài
            </button>

            <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/60 dark:border-orange-900/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${currentStep === 3 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>3</span>
              Xem trước & Phát hành
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              BƯỚC 1: THÔNG TIN BÀI TẬP
          ══════════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 1.0 TÍNH NĂNG AI PHÂN TÍCH ĐỀ BÀI */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Icon AI Công nghệ hiện đại + Tiêu đề & Thông điệp */}
                  <div className="flex items-center gap-3.5">
                    {/* Modern Professional AI Neural Star Emblem */}
                    <div className="relative shrink-0">
                      <svg
                        width="42"
                        height="42"
                        viewBox="0 0 42 42"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="drop-shadow-sm"
                      >
                        <defs>
                          <linearGradient id="aiBoxBg" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#0B132B" />
                            <stop offset="100%" stopColor="#1E293B" />
                          </linearGradient>
                          <linearGradient id="aiStarGrad" x1="7" y1="7" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="60%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#818CF8" />
                          </linearGradient>
                          <radialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        {/* Obsidian rounded base */}
                        <rect width="42" height="42" rx="12" fill="url(#aiBoxBg)" stroke="#334155" strokeWidth="1" />
                        {/* Radial core glow */}
                        <circle cx="21" cy="21" r="14" fill="url(#aiGlow)" />
                        {/* Core 4-point AI Star */}
                        <path
                          d="M21 8C21 15.1797 15.1797 21 8 21C15.1797 21 21 26.8203 21 34C21 26.8203 26.8203 21 34 21C26.8203 21 21 15.1797 21 8Z"
                          fill="url(#aiStarGrad)"
                        />
                        {/* Center core highlight */}
                        <circle cx="21" cy="21" r="2.2" fill="#FFFFFF" />
                        {/* Satellite micro-spark */}
                        <path
                          d="M31 9C31 11.2091 29.2091 13 27 13C29.2091 13 31 14.7909 31 17C31 14.7909 32.7909 13 35 13C32.7909 13 31 11.2091 31 9Z"
                          fill="#38BDF8"
                          fillOpacity="0.9"
                        />
                      </svg>

                      {/* Đèn báo trạng thái AI Sẵn sàng */}
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs"></span>
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Cấu hình thông minh bằng AI
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tự động đọc hiểu đề thi để thiết lập môi trường chạy, bộ test cases và barem điểm.
                      </p>
                    </div>
                  </div>

                  {/* Right: Duy nhất 1 nút AI phân tích đề bài */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={isAiAnalyzing}
                      disabled={isAiAnalyzing}
                      onClick={() => triggerAiAutoConfig()}
                      className="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isAiAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang phân tích...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-white" />
                          <span>AI phân tích đề bài</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* State: Cảnh báo API Key hết hạn */}
                {aiApiKeyError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start justify-between gap-3 text-red-700 dark:text-red-300 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-800 dark:text-red-200">
                          Khóa API của AI đã hết hạn hoặc không hợp lệ!
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                          {aiApiKeyError}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiApiKeyError(null)}
                      className="text-red-400 hover:text-red-600 dark:hover:text-red-200 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      title="Đóng thông báo"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* State: AI Đang phân tích (Progress box) */}
                {isAiAnalyzing && (
                  <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-orange-300 dark:border-orange-800 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI đang xử lý thông minh...
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Ollama / Cloud Free Engine</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {aiAnalyzingStep || 'Đang chuẩn bị phân tích đề bài...'}
                    </p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full w-4/5 animate-pulse rounded-full" />
                    </div>
                  </div>
                )}

                {/* State: AI Đã hoàn thành đề xuất cấu hình (Proposal Summary Card) */}
                {aiProposal && !isAiAnalyzing && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-900/90 border-2 border-orange-400/80 dark:border-orange-500/80 p-5 shadow-lg shadow-orange-500/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Glowing background accent */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-gradient-to-tr from-indigo-400/10 via-purple-300/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                    {/* TOP HEADER */}
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-orange-500/30">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                          </span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                              AI ĐÃ TỰ ĐỘNG THIẾT LẬP TOÀN BỘ DỮ LIỆU BÀI TẬP
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                              <Cpu className="w-3 h-3" />
                              {aiProposal.modelUsed || 'Cloud AI (120B)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal leading-relaxed">
                            {aiProposal.summaryExplanation || 'Hệ thống đã phân tích chuyên sâu tệp đề thi và tự động điền đầy đủ 100% dữ liệu cho cả Bước 1 & Bước 2.'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Đã tự động điền Bước 1 & 2
                        </span>
                      </div>
                    </div>

                    {/* DUAL PILLARS: BƯỚC 1 vs BƯỚC 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                      {/* CỘT 1: BƯỚC 1 (Đề bài & Quy định nộp) */}
                      <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-extrabold flex items-center justify-center text-[10px]">1</span>
                            Bước 1: Đề bài & Quy cách nộp
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã điền xong
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-400 block font-medium">Tiêu đề được đề xuất:</span>
                              <p className="font-bold text-slate-900 dark:text-white truncate" title={title || aiProposal.suggestedTitle}>
                                {title || aiProposal.suggestedTitle || 'Bài tập thực hành lập trình'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Ngôn ngữ yêu cầu:</span>
                              <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">
                                {aiProposal.detectedLanguage || requiredLanguage}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Hình thức nộp:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate block">
                                {(aiProposal.submissionFormat?.submissionType || submissionType) === 'single_file' ? '1 File mã nguồn' : 'Dự án ZIP nhiều file'}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              Entry: {aiProposal.submissionFormat?.entryFile || entryFile}
                            </span>
                            <span>•</span>
                            <span>Định dạng: {(aiProposal.submissionFormat?.allowedFormats || allowedFormats).join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      {/* CỘT 2: BƯỚC 2 (Sandbox & Kiểm thử tự động) */}
                      <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                          <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center text-[10px]">2</span>
                            Bước 2: Sandbox & Test Cases
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã cấu hình
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-400 block font-medium">Môi trường chạy code:</span>
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {aiProposal.runtimeConfig?.version || runtimeVersion}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Bộ Test cases:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {aiProposal.testCases?.length || testCases.length} kịch bản
                              </span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-medium">
                                Có {(aiProposal.testCases || testCases).filter((t: any) => t.isHidden).length} test ẩn chống gian lận
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[10px] text-slate-400 block">Barem Rubric:</span>
                                {aiProposal.provenanceReport?.rubricSourceType === 'ORIGINAL_DOCUMENT' ? (
                                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                                    Gốc từ đề
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-300 dark:border-purple-800">
                                    AI đề xuất
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {aiProposal.rubricCriteria?.length || rubricCriteria.length} Tiêu chí ({maxScore}đ)
                              </span>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate" title={aiProposal.provenanceReport?.rubricAnalysisNotes}>
                                {aiProposal.provenanceReport?.rubricSourceType === 'ORIGINAL_DOCUMENT'
                                  ? 'Đã trích xuất & giữ nguyên 100% barem gốc'
                                  : 'Tùy biến theo yêu cầu cụ thể của bài'}
                              </span>
                            </div>
                          </div>

                          {aiProposal.assignmentCategory === 'sql' ? (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium pt-0.5">
                              <Database className="w-3 h-3" />
                              <span>CSDL PostgreSQL: Đã sinh sẵn Schema DDL, Seed Data & Truy vấn chuẩn</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5 font-mono truncate">
                              <span>Lệnh chạy: {aiProposal.runtimeConfig?.runCommand || runCommand || 'Chuẩn Docker'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RAG AUTOMATION & KNOWLEDGE ASSISTANT BANNER */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/80 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/30 border border-indigo-200/90 dark:border-indigo-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h6 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                              TÍNH NĂNG RAG AI TỰ ĐỘNG HỖ TRỢ (RAG KNOWLEDGE HUB)
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                                TỰ ĐỘNG KÍCH HOẠT
                              </span>
                            </h6>
                          </div>
                        </div>
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold hidden sm:inline-block">
                          ✓ Không cần cấu hình RAG thủ công
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50">
                          <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-indigo-500" /> Vector Indexing Đề bài
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[10px] leading-relaxed">
                            Đề bài & yêu cầu được tự động đưa vào kho tri thức vector phục vụ AI Tutor giải đáp và AI Grader đối soát.
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50">
                          <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-500" /> Nhận diện Bẫy lỗi & Biên
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[10px] leading-relaxed line-clamp-2" title={aiProposal.edgeCasesAndPitfalls?.commonPitfalls || commonPitfalls}>
                            {aiProposal.edgeCasesAndPitfalls?.commonPitfalls || commonPitfalls || 'AI đã nhận diện các bẫy lỗi và trường hợp biên của bài.'}
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5 flex items-center gap-1">
                            <CheckCheck className="w-3 h-3 text-emerald-500" /> Đáp án & Lời giải mẫu
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[10px] leading-relaxed">
                            {aiProposal.sampleSolution ? 'Đã tạo sẵn mã giải mẫu tham chiếu chuẩn mực để đối chiếu kết quả.' : 'Tài liệu tham khảo chuyên ngành môn học đã được chuẩn bị.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTION FOOTER */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        💡 Dữ liệu đã được áp dụng vào các ô nhập bên dưới. Bạn có thể kiểm tra hoặc chuyển tiếp sang Bước 2.
                      </p>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => triggerAiAutoConfig()}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Phân tích lại
                        </button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            if (!title.trim()) {
                              alert('Vui lòng nhập tên bài tập.')
                              return
                            }
                            if (!classId) {
                              alert('Vui lòng chọn lớp học.')
                              return
                            }
                            setCurrentStep(2)
                          }}
                          className="px-4 py-2 text-xs bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold shadow-md shadow-orange-500/25 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Xác nhận & Chuyển sang Bước 2</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── UPLOAD ĐỀ THI (WORD / PDF) VỚI ICON FOLDER CHÂN THỰC (TỐI GIẢN MÀU SẮC NỀN) ─── */}
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-750 hover:border-slate-400 dark:hover:border-slate-600 p-4 sm:p-5 transition-all shadow-2xs group">
                <input
                  ref={examFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleExamFileUpload}
                  className="hidden"
                />

                {!examFile ? (
                  <div
                    onClick={() => examFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const files = e.dataTransfer.files
                      if (files && files.length > 0) {
                        const fakeEvent = { target: { files } } as any
                        handleExamFileUpload(fakeEvent)
                      }
                    }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4 text-center sm:text-left">
                      {/* Realistic 3D Folder Icon (Điểm nhấn màu sắc duy nhất) */}
                      <div className="transform group-hover:scale-105 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0">
                        <svg
                          width="56"
                          height="48"
                          viewBox="0 0 56 48"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="drop-shadow-sm"
                        >
                          <defs>
                            <linearGradient id="folderBackGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#F59E0B" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                            <linearGradient id="folderFrontGrad" x1="0" y1="14" x2="0" y2="48" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                            <linearGradient id="folderPaperGrad" x1="0" y1="0" x2="0" y2="30" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#FFFFFF" />
                              <stop offset="100%" stopColor="#F8FAFC" />
                            </linearGradient>
                            <filter id="folderDropShadow" x="-2" y="0" width="60" height="52" filterUnits="userSpaceOnUse">
                              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#B45309" floodOpacity="0.25" />
                            </filter>
                          </defs>
                          {/* Back flap */}
                          <path
                            d="M5 10C5 7.79086 6.79086 6 9 6H21.5858C22.6466 6 23.664 6.42143 24.4142 7.17157L27.5 10.2574C28.2502 11.0075 29.2676 11.4289 30.3284 11.4289H47C49.2091 11.4289 51 13.2198 51 15.4289V38C51 40.2091 49.2091 42 47 42H9C6.79086 42 5 40.2091 5 38V10Z"
                            fill="url(#folderBackGrad)"
                          />
                          {/* Realistic Sheet of Paper with content lines */}
                          <rect x="14" y="8" width="28" height="26" rx="2.5" fill="url(#folderPaperGrad)" stroke="#CBD5E1" strokeWidth="0.8" />
                          <line x1="18" y1="14" x2="28" y2="14" stroke="#3B82F6" strokeWidth="1.75" strokeLinecap="round" />
                          <line x1="18" y1="19" x2="38" y2="19" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
                          <line x1="18" y1="24" x2="34" y2="24" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
                          {/* Front pocket with specular highlight */}
                          <path
                            d="M5 18C5 15.7909 6.79086 14 9 14H47C49.2091 14 51 15.7909 51 18V38C51 40.2091 49.2091 42 47 42H9C6.79086 42 5 40.2091 5 38V18Z"
                            fill="url(#folderFrontGrad)"
                            filter="url(#folderDropShadow)"
                          />
                          <path d="M7 16H49" stroke="white" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
                          {/* Upload arrow circular badge */}
                          <circle cx="41" cy="34" r="8" fill="#EA580C" stroke="white" strokeWidth="1.5" />
                          <path
                            d="M41 30V38M41 30L38 33M41 30L44 33"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            Upload đề thi
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                          Tải lên tệp Word hoặc PDF đề bài. AI sẽ tự động đọc hiểu và điền toàn bộ dữ liệu cấu hình bên dưới cho bạn.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-750 transition-all">
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">Chọn tệp</span>
                        <span className="text-[11px] text-slate-400 font-mono">PDF, DOCX</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-750 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-300/80 dark:border-slate-700">
                        <FileCheck className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {examFile.name}
                          </p>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-750 text-slate-600 dark:text-slate-300 shrink-0">
                            Đã đồng bộ AI
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Dung lượng: <span className="font-semibold text-slate-600 dark:text-slate-300">{examFile.size}</span> • Đã phân tích tự động vào Bước 1 & Bước 2
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => examFileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        Đổi file
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamFile(null)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Xóa tệp đề bài"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 1.1 Thông tin chung */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">1.1 Thông tin chung</h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên bài tập *</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="VD: Quản lý sinh viên bằng Java (OOP, Danh sách liên kết & Xử lý File)"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Môn học / Lớp học *</label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={classId}
                      onChange={e => setClassId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.classCode || c.code} - {c.subject?.name || c.subject?.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Điểm tối đa</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={maxScore}
                        onChange={e => setMaxScore(Number(e.target.value) || 10)}
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">điểm</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Thời gian bắt đầu</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hạn nộp bài (Deadline)</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mô tả và yêu cầu đề bài *</label>
                  <textarea
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-sans"
                    placeholder="Nhập mô tả đề bài chi tiết, các yêu cầu kỹ thuật, các hàm cần cài đặt..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Cho phép nộp lại hay không */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Cho phép sinh viên nộp lại (Resubmission)</p>
                      <p className="text-[11px] text-slate-400">Sinh viên có thể sửa đổi và nộp lại bài trước thời hạn chót.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowResubmission}
                        onChange={e => setAllowResubmission(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  {allowResubmission && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Số lần nộp tối đa</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          value={maxAttempts}
                          onChange={e => setMaxAttempts(Number(e.target.value))}
                        >
                          <option value={0}>Không giới hạn số lần</option>
                          <option value={1}>Chỉ 1 lần (không nộp lại)</option>
                          <option value={2}>Tối đa 2 lần</option>
                          <option value={3}>Tối đa 3 lần</option>
                          <option value={5}>Tối đa 5 lần</option>
                          <option value={10}>Tối đa 10 lần</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Quy tắc ghi nhận điểm</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          value={resubmissionPolicy}
                          onChange={e => setResubmissionPolicy(e.target.value as any)}
                        >
                          <option value="highest">Lấy điểm cao nhất trong các lần nộp</option>
                          <option value="latest">Lấy điểm của lần nộp cuối cùng</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 1.2 Yêu cầu nộp bài */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Layers className="w-4 h-4 text-orange-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">1.2 Yêu cầu nộp bài</h4>
                </div>

                {/* Kiểu bài nộp */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hình thức nộp code của sinh viên</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionType('single_file')
                        setSubmissionStyle('single_file')
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        submissionType === 'single_file'
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <FileCode className={`w-5 h-5 shrink-0 mt-0.5 ${submissionType === 'single_file' ? 'text-orange-500' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-xs">Nộp một file code đơn lẻ</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Sinh viên chỉ nộp đúng 1 file script (VD: Solution.java, main.py, query.sql).</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionType('project_archive')
                        setSubmissionStyle('project_archive')
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        submissionType === 'project_archive'
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <FileArchive className={`w-5 h-5 shrink-0 mt-0.5 ${submissionType === 'project_archive' ? 'text-orange-500' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-xs">Nộp thư mục dự án (ZIP)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Sinh viên nén file ZIP chứa nhiều file code, package, thư viện hoặc cấu trúc chuẩn.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Ngôn ngữ lập trình yêu cầu */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngôn ngữ lập trình yêu cầu</label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      value={requiredLanguage}
                      onChange={e => handleLanguageChange(e.target.value, true)}
                    >
                      <option value="C">C (GCC / Clang C17)</option>
                      <option value="Java">Java (JDK 17 / 21)</option>
                      <option value="Python">Python 3.x</option>
                      <option value="C++">C++ (GCC / Clang)</option>
                      <option value="SQL">SQL (PostgreSQL, MySQL, SQL Server)</option>
                      <option value="JavaScript">JavaScript (Node.js)</option>
                      <option value="TypeScript">TypeScript</option>
                      <option value="C#">C# (.NET Core)</option>
                    </select>
                  </div>

                  {/* File bắt buộc / file khởi chạy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File bắt buộc / file khởi chạy</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs"
                      placeholder="VD: Main.java, index.js hoặc app.py"
                      value={entryFile}
                      onChange={e => setEntryFile(e.target.value)}
                    />
                  </div>
                </div>

                {/* Định dạng được phép */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Định dạng file được phép nộp</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {['.java', '.py', '.cpp', '.zip', '.sql', '.js', '.ts', '.cs', '.tar.gz'].map(fmt => {
                      const isChecked = allowedFormats.includes(fmt)
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => toggleFormat(fmt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors border ${
                            isChecked
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isChecked ? '✓ ' : ''}{fmt}
                        </button>
                      )
                    })}

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Thêm đuôi .c, .rar..."
                        className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                        value={customFormatInput}
                        onChange={e => setCustomFormatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomFormat())}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addCustomFormat} className="h-7 px-2 text-xs">
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Cấu trúc thư mục yêu cầu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ghi chú cấu trúc thư mục hoặc file bắt buộc
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                    placeholder="VD: Dự án ZIP nén từ thư mục gốc chứa file Main.java, Student.java và thư mục test/"
                    value={directoryStructure}
                    onChange={e => setDirectoryStructure(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              BƯỚC 2: CẤU HÌNH CHẤM BÀI (4 NHÓM CẤU HÌNH)
          ══════════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Bước 2 kèm nút Kích hoạt AI Cấu hình lại */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Cấu hình chi tiết bộ chấm & môi trường
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Kiểm tra và tùy biến 4 nhóm cấu hình bên dưới. Bạn có thể yêu cầu AI tái phân tích bất cứ lúc nào.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={isAiAnalyzing}
                  disabled={isAiAnalyzing}
                  onClick={() => triggerAiAutoConfig()}
                  className="shrink-0 gap-1.5 text-xs border-orange-200 dark:border-orange-900/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  🪄 AI Tự cấu hình lại
                </Button>
              </div>

              {/* Step 2 Sub-Navigation */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                {[
                  { id: 'runtime', label: '2.1 Môi trường chạy', icon: Cpu, badge: runtimeLanguage },
                  { id: 'testcases', label: '2.2 Bộ kiểm thử', icon: CheckSquare, badge: `${testCases.length} tests` },
                  { id: 'rubric', label: '2.3 Tiêu chí & Rubric', icon: Sliders, badge: `${totalRubricScore}/${maxScore}đ` },
                  { id: 'ai', label: '2.4 Cấu hình AI RAG', icon: Sparkles, badge: 'RAG ON' },
                ].map(item => {
                  const Icon = item.icon
                  const active = subTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSubTab(item.id as Step2SubTab)}
                      className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between ${
                        active
                          ? 'bg-white dark:bg-slate-900 shadow-xs border border-orange-300 dark:border-orange-800'
                          : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${active ? 'text-orange-500' : 'text-slate-400'}`} />
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          active ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className={`text-xs font-bold mt-2 ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                        {item.label}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* ── 2.1 MÔI TRƯỜNG VÀ CÁCH CHẠY CODE ── */}
              {subTab === 'runtime' && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xs">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-orange-500" />
                      2.1. Môi trường và cách chạy code
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Xác định cách hệ thống biên dịch và thực thi bài nộp trong môi trường sandbox an toàn.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngôn ngữ</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                        value={runtimeLanguage}
                        onChange={e => setRuntimeLanguage(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phiên bản Runtime/Compiler</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                        value={runtimeVersion}
                        onChange={e => setRuntimeVersion(e.target.value)}
                        placeholder="VD: Java 17 OpenJDK, Python 3.11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loại bài tập</label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                        value={assignmentCategory}
                        onChange={e => {
                          const cat = e.target.value as any
                          setAssignmentCategory(cat)
                          if (cat === 'sql') {
                            setRuntimeLanguage('SQL')
                            loadRubricPreset('database_sql')
                          }
                        }}
                      >
                        <option value="standard">Chương trình thông thường</option>
                        <option value="sql">Bài tập SQL / Database</option>
                        <option value="multimodule">Dự án nhiều module (Maven / Gradle / NPM)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lệnh biên dịch (Build Command)</label>
                      <div className="relative">
                        <Terminal className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200"
                          value={buildCommand}
                          onChange={e => setBuildCommand(e.target.value)}
                          placeholder="VD: javac Main.java (để trống nếu thông dịch)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lệnh thực thi (Run Command)</label>
                      <div className="relative">
                        <Terminal className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200"
                          value={runCommand}
                          onChange={e => setRunCommand(e.target.value)}
                          placeholder="VD: java Main hoặc python main.py"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sandbox Safety Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-orange-500" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Hệ thống tự xử lý môi trường an toàn (Sandbox Defaults)
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Hệ thống tự động khởi tạo môi trường tương ứng, chạy code trong sandbox cô lập và áp dụng giới hạn an toàn mặc định:
                      <strong className="text-slate-800 dark:text-slate-200"> Thời gian CPU tối đa: 2.0s</strong> · <strong className="text-slate-800 dark:text-slate-200">Bộ nhớ RAM: 256MB</strong> · <strong className="text-slate-800 dark:text-slate-200">Chặn truy cập mạng bên ngoài</strong>.
                      Giáo viên không cần cấu hình hạ tầng container thủ công.
                    </p>
                  </div>

                  {/* ── CẤU HÌNH ĐẶC BIỆT NẾU LÀ BÀI TẬP SQL/DATABASE ── */}
                  {assignmentCategory === 'sql' && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-orange-500" />
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-200">
                            Cấu hình chuyên biệt cho bài tập SQL / Database
                          </h5>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                          Isolated Sandbox DB
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Hệ quản trị CSDL (DBMS)
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            value={sqlDbms}
                            onChange={e => setSqlDbms(e.target.value as any)}
                          >
                            <option value="postgresql">PostgreSQL (15 / 16)</option>
                            <option value="mysql">MySQL 8.0</option>
                            <option value="sqlserver">Microsoft SQL Server</option>
                            <option value="sqlite">SQLite 3</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Cách so sánh kết quả truy vấn
                          </label>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                            value={sqlComparisonMode}
                            onChange={e => setSqlComparisonMode(e.target.value as any)}
                          >
                            <option value="ignore_order">Bỏ qua thứ tự hàng (khuyên dùng khi không có ORDER BY)</option>
                            <option value="exact">Chính xác tuyệt đối từng hàng & thứ tự (strict)</option>
                            <option value="structure_and_data">So sánh cấu trúc cột và dữ liệu</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Schema khởi tạo database (DDL CREATE TABLE...)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 resize-none"
                          placeholder="CREATE TABLE Students (id INT PRIMARY KEY, name VARCHAR(100), gpa DECIMAL(3,2));"
                          value={sqlSchemaDdl}
                          onChange={e => setSqlSchemaDdl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Dữ liệu mẫu kiểm thử (Seed Data / INSERT scripts)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 resize-none"
                          placeholder="INSERT INTO Students VALUES (1, 'Nguyen Van A', 3.8), (2, 'Tran Thi B', 3.2);"
                          value={sqlSeedData}
                          onChange={e => setSqlSeedData(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Query sinh viên cần viết hoặc truy vấn kết quả chuẩn
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 resize-none"
                          placeholder="SELECT id, name, gpa FROM Students WHERE gpa >= 3.5 ORDER BY gpa DESC;"
                          value={sqlExpectedQuery}
                          onChange={e => setSqlExpectedQuery(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Yêu cầu về khóa, quan hệ, ràng buộc và tính đúng đắn dữ liệu
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                          placeholder="VD: Khóa chính tự tăng, ràng buộc foreign key ON DELETE CASCADE, gpa trong khoảng 0.0 - 4.0"
                          value={sqlConstraintsNotes}
                          onChange={e => setSqlConstraintsNotes(e.target.value)}
                        />
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        Hệ thống chạy truy vấn trên database kiểm thử riêng biệt, tuyệt đối không ảnh hưởng đến CSDL thực tế.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 2.2 BỘ KIỂM THỬ TỰ ĐỘNG (TEST CASES) ── */}
              {subTab === 'testcases' && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-orange-500" />
                        2.2. Bộ kiểm thử tự động (Test Cases)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kiểm tra code có thực thi đúng logic, xử lý đầy đủ đầu vào và kết quả mong đợi.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkModal(true)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Nhập nhanh
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={distributeTestCasePoints}
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Chia đều điểm
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={addTestCase}
                        className="text-xs h-8 gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm test
                      </Button>
                    </div>
                  </div>

                  {/* List of test cases */}
                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div
                        key={tc.id}
                        className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                          tc.isHidden
                            ? 'bg-slate-50/80 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-750'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center font-mono">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Test Case {index + 1}
                            </span>
                            {tc.isHidden ? (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                                Test ẩn (Chống hardcode)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                                Công khai
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-slate-400">Điểm:</span>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                className="w-14 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold text-xs"
                                value={tc.points}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0
                                  setTestCases(testCases.map(t => t.id === tc.id ? { ...t, points: val } : t))
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTestCases(testCases.map(t => t.id === tc.id ? { ...t, isHidden: !t.isHidden } : t))
                              }}
                              className="px-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {tc.isHidden ? 'Chuyển công khai' : 'Đặt thành test ẩn'}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeTestCase(tc.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                              <span>Đầu vào (Input / Stdin)</span>
                              <span className="text-[10px] text-slate-400">Chuỗi truyền vào chương trình</span>
                            </label>
                            <textarea
                              rows={2}
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs resize-none"
                              placeholder="VD: 2 3"
                              value={tc.input}
                              onChange={e => {
                                const val = e.target.value
                                setTestCases(testCases.map(t => t.id === tc.id ? { ...t, input: val } : t))
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                              <span>Kết quả mong đợi (Expected Output)</span>
                              <select
                                className="text-[10px] bg-transparent border-0 text-slate-400 focus:ring-0 p-0"
                                value={tc.comparisonMode}
                                onChange={e => {
                                  const mode = e.target.value as any
                                  setTestCases(testCases.map(t => t.id === tc.id ? { ...t, comparisonMode: mode } : t))
                                }}
                              >
                                <option value="trim_whitespace">Bỏ qua khoảng trắng</option>
                                <option value="exact">Chính xác từng ký tự</option>
                                <option value="flexible">Khớp linh hoạt / Regex</option>
                              </select>
                            </label>
                            <textarea
                              rows={2}
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs resize-none"
                              placeholder="VD: 5"
                              value={tc.expectedOutput}
                              onChange={e => {
                                const val = e.target.value
                                setTestCases(testCases.map(t => t.id === tc.id ? { ...t, expectedOutput: val } : t))
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bulk modal */}
                  {showBulkModal && (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Nhập nhanh danh sách test case (Bulk)</span>
                        <button type="button" onClick={() => setShowBulkModal(false)} className="text-xs text-slate-400 hover:text-slate-600">Đóng</button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Nhập các test case ngăn cách nhau bởi <code>---</code>. Dòng 1 là Input, dòng 2 là Output:
                      </p>
                      <textarea
                        rows={5}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                        placeholder={`2 3\n5\n---\n-2 5\n3\n---\n0 0\n0`}
                        value={bulkInputText}
                        onChange={e => setBulkInputText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkModal(false)}>Hủy</Button>
                        <Button type="button" variant="primary" size="sm" onClick={handleBulkImport}>Áp dụng</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 2.3 RUBRIC — TIÊU CHÍ VÀ TRỌNG SỐ CHẤM ĐIỂM ── */}
              {subTab === 'rubric' && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-orange-500" />
                        2.3. Rubric — Tiêu chí và trọng số chấm điểm
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Barem chỉ dẫn quan trọng nhất để bộ chấm code AI và Test Runner phân tích chất lượng bài làm.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-orange-600 dark:text-orange-400"
                        value={selectedPresetKey}
                        onChange={e => loadRubricPreset(e.target.value)}
                      >
                        <option value="oop_java">Mẫu: Lập trình OOP</option>
                        <option value="algorithm_basic">Mẫu: Thuật toán & Cơ bản</option>
                        <option value="database_sql">Mẫu: Cơ sở dữ liệu SQL</option>
                      </select>
                      <Button type="button" variant="primary" size="sm" onClick={addCriterion} className="text-xs h-8 gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        Thêm tiêu chí
                      </Button>
                    </div>
                  </div>

                  {/* Rubric Score Total Alert */}
                  <div className="p-3 rounded-xl flex items-center justify-between text-xs border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      {totalRubricScore === maxScore ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>
                        Tổng điểm tiêu chí: <strong>{totalRubricScore}đ</strong> / Điểm tối đa bài tập: <strong>{maxScore}đ</strong>
                      </span>
                    </div>
                    {totalRubricScore === maxScore ? (
                      <span className="font-bold text-[11px] bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                        ✓ Điểm số đã khớp
                      </span>
                    ) : (
                      <span className="font-bold text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        Chênh lệch {Math.abs(totalRubricScore - maxScore)}đ
                      </span>
                    )}
                  </div>

                  {/* Criteria Cards */}
                  <div className="space-y-3">
                    {rubricCriteria.map((rc, idx) => (
                      <div
                        key={rc.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center font-mono shrink-0">
                              #{idx + 1}
                            </span>
                            {rc.source === 'EXTRACTED' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800 shrink-0" title="Trích xuất trực tiếp từ tài liệu gốc">
                                Gốc từ đề
                              </span>
                            )}
                            {rc.source === 'AI_SUGGESTED' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-bold border border-purple-300 dark:border-purple-800 shrink-0" title="Barem do AI đề xuất">
                                AI đề xuất
                              </span>
                            )}
                            {rc.reviewNeeded && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold border border-amber-300 dark:border-amber-800 shrink-0" title="Cần giảng viên kiểm tra điểm thành phần">
                                Cần xem
                              </span>
                            )}
                            <input
                              type="text"
                              className="font-bold text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
                              value={rc.name}
                              onChange={e => {
                                const val = e.target.value
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, name: val } : r))
                              }}
                              placeholder="Tên tiêu chí (VD: Đúng chức năng)"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Chấm bởi */}
                            <select
                              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                              value={rc.method}
                              onChange={e => {
                                const m = e.target.value as any
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, method: m } : r))
                              }}
                            >
                              <option value="test_runner">Test tự động</option>
                              <option value="ai_assessment">AI đánh giá</option>
                              <option value="deterministic_rule">Quy tắc xác định</option>
                              <option value="hybrid">AI + Quy tắc</option>
                            </select>

                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-slate-400">Điểm:</span>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                className="w-14 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-xs"
                                value={rc.maxPoints}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0
                                  setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, maxPoints: val } : r))
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCriterion(rc.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Chi tiết điều kiện đạt / trừ điểm */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                              ✓ Điều kiện đạt chuẩn
                            </label>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                              placeholder="VD: Chạy đúng toàn bộ test case đầu vào chuẩn"
                              value={rc.passCondition}
                              onChange={e => {
                                const val = e.target.value
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, passCondition: val } : r))
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                              ✕ Điều kiện chưa đạt / Trừ điểm
                            </label>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                              placeholder="VD: Sai logic đầu ra, không in đúng định dạng"
                              value={rc.failCondition}
                              onChange={e => {
                                const val = e.target.value
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, failCondition: val } : r))
                              }}
                            />
                          </div>
                        </div>

                        {/* Hướng dẫn chi tiết cho AI */}
                        {(rc.method === 'ai_assessment' || rc.method === 'hybrid') && (
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                              Hướng dẫn chi tiết dành cho AI (Prompt instructions)
                            </label>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                              placeholder="VD: Kiểm tra tính đóng gói, đặt tên biến camelCase và xử lý ngoại lệ cẩn thận..."
                              value={rc.aiGuidance}
                              onChange={e => {
                                const val = e.target.value
                                setRubricCriteria(rubricCriteria.map(r => r.id === rc.id ? { ...r, aiGuidance: val } : r))
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => alert('Đã lưu mẫu rubric thành công vào bộ nhớ giáo viên!')}
                      className="text-xs gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-orange-500" />
                      Lưu rubric thành mẫu tái sử dụng
                    </Button>
                  </div>
                </div>
              )}

              {/* ── 2.4 CẤU HÌNH AI VÀ NGUỒN KIẾN THỨC (RAG) ── */}
              {subTab === 'ai' && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      2.4. Cấu hình AI và nguồn kiến thức (RAG)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quy định dữ liệu tài liệu AI cần tham khảo và các khía cạnh cần tập trung đánh giá.
                    </p>
                  </div>

                  {/* Lời giải mẫu / Benchmark Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Lời giải mẫu hoặc code tham chiếu (Benchmark solution)</span>
                      <span className="text-[10px] text-slate-400">Tùy chọn - Giúp AI so sánh logic tối ưu</span>
                    </label>
                    <textarea
                      rows={4}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 resize-none"
                      placeholder={`// Dán code mẫu của giáo viên tại đây\npublic class Main {\n    public static void main(String[] args) {\n        // ...\n    }\n}`}
                      value={sampleSolution}
                      onChange={e => setSampleSolution(e.target.value)}
                    />
                  </div>

                  {/* Tài liệu môn học & Hướng dẫn chấm */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tài liệu môn học & Tham chiếu kiến thức
                      </label>
                      <textarea
                        rows={3}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                        placeholder="VD: Giáo trình Chương 3 OOP, Slide bài giảng Java Collections, chuẩn Java Code Conventions..."
                        value={referenceMaterials}
                        onChange={e => setReferenceMaterials(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Hướng dẫn chấm & Các lỗi sinh viên dễ mắc
                      </label>
                      <textarea
                        rows={3}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                        placeholder="VD: Sinh viên hay quên đóng Scanner, lỗi chia cho 0, hoặc hardcode danh sách sinh viên..."
                        value={commonPitfalls}
                        onChange={e => setCommonPitfalls(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Phạm vi đánh giá của AI */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phạm vi đánh giá của AI khi phân tích mã nguồn
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'logic', label: 'Tính đúng đắn của logic & giải thuật', desc: 'Phát hiện lỗi logic tiềm ẩn' },
                        { key: 'codeQuality', label: 'Chất lượng code & Quy ước đặt tên', desc: 'Đánh giá clean code, camelCase' },
                        { key: 'maintainability', label: 'Cấu trúc thư mục & Khả năng bảo trì', desc: 'Tách hàm, đóng gói class' },
                        { key: 'edgeCases', label: 'Xử lý ngoại lệ & Trường hợp biên', desc: 'Bắt lỗi try-catch, input null' },
                        { key: 'specCompliance', label: 'Mức độ tuân thủ yêu cầu đề bài', desc: 'Đầy đủ tính năng được giao' },
                      ].map(item => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(aiScope as any)[item.key]}
                            onChange={e => setAiScope({ ...aiScope, [item.key]: e.target.checked })}
                            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 mt-0.5"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">{item.label}</p>
                            <p className="text-[10px] text-slate-400">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RAG Guarantee Notice */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">Cơ chế RAG tự động của hệ thống</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        Hệ thống sẽ tự động lập chỉ mục đề bài, rubric và các tài liệu tham chiếu trên qua pipeline RAG thông minh.
                        <strong> Giáo viên không cần nhập vector embedding, kích thước chunk hay cấu hình kỹ thuật hạ tầng phức tạp.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              BƯỚC 3: XEM TRƯỚC VÀ PHÁT HÀNH
          ══════════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Hero Banner with Brand Orange Gradient & Status Checklist */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-slate-50 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-950 border border-orange-500/30 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                          Cấu hình bài tập đã sẵn sàng công bố
                        </h4>
                        <Badge variant="success" className="text-[10px] uppercase tracking-wider font-bold">
                          ✓ Đã kiểm định
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Hệ thống đã tự động thẩm định cú pháp chạy test, barem điểm chuẩn hóa và liên kết tài liệu qua RAG pipeline.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-1.5 border border-orange-300/60 dark:border-orange-800">
                      <Award className="w-4 h-4 text-orange-500" />
                      {maxScore} Điểm tối đa
                    </span>
                  </div>
                </div>

                {/* 4 Metric Badges in Hero */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-orange-200/50 dark:border-slate-800/80">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-orange-200/40 dark:border-slate-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Môn & Lớp</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                      {selectedClass?.classCode || selectedClass?.code || 'Chưa chọn'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-orange-200/40 dark:border-slate-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Bộ Test Sandbox</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block mt-0.5">
                      {testCases.length} Tests ({testCases.filter(t => t.isHidden).length} ẩn)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-orange-200/40 dark:border-slate-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Rubric Điểm</span>
                    <span className={`font-bold text-xs block mt-0.5 ${totalRubricScore === maxScore ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {rubricCriteria.length} Tiêu chí ({totalRubricScore}/{maxScore}đ)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-orange-200/40 dark:border-slate-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Cơ chế AI</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-orange-500" /> RAG Auto
                    </span>
                  </div>
                </div>
              </div>

              {/* Bento Grid: 4 Core Review Cards (Unified Slate Palette with Brand Orange Accents) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD 1: THÔNG TIN BÀI TẬP & LỚP HỌC */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        1. Đề bài & Thời hạn
                      </h5>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {selectedClass?.subject?.code || 'Môn học'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Tiêu đề bài tập</span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {title || 'Chưa đặt tiêu đề'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lớp được giao</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedClass?.classCode || selectedClass?.code || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Hạn nộp (Deadline)</span>
                        <p className="font-semibold text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dueDate ? new Date(dueDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Không thời hạn'}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Chính sách nộp lại:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {allowResubmission
                          ? `${maxAttempts === 0 ? 'Tự do' : `Tối đa ${maxAttempts} lần`} • ${resubmissionPolicy === 'highest' ? 'Lấy điểm cao nhất' : 'Lấy lần cuối'}`
                          : 'Chỉ nộp 1 lần'}
                      </span>
                    </div>

                    {/* Hiển thị đề thi đã tải lên nếu có */}
                    {examFile && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          Đề thi đính kèm:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                          {examFile.name} ({examFile.size})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD 2: MÔI TRƯỜNG SANDBOX & ĐỊNH DẠNG CODE */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        2. Môi trường & Nộp bài
                      </h5>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {runtimeLanguage}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Hình thức bài nộp</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          {submissionType === 'single_file' ? <FileCode className="w-3.5 h-3.5 text-slate-500" /> : <FileArchive className="w-3.5 h-3.5 text-slate-500" />}
                          {submissionType === 'single_file' ? '1 file code đơn lẻ' : 'Thư mục ZIP dự án'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">File khởi chạy chính</span>
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5 block">
                          {entryFile || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 space-y-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Định dạng file:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{allowedFormats.join(', ')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Sandbox Safety:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-slate-500" /> CPU 2.0s • RAM 256MB • Offline
                        </span>
                      </div>
                    </div>

                    {assignmentCategory === 'sql' && (
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] space-y-0.5 text-slate-700 dark:text-slate-300">
                        <p className="font-bold flex items-center gap-1"><Database className="w-3 h-3 text-orange-500" /> CSDL: {sqlDbms.toUpperCase()} (Sandbox DB)</p>
                        <p className="opacity-90">So sánh kết quả: {sqlComparisonMode === 'ignore_order' ? 'Bỏ qua thứ tự dòng' : 'Chính xác'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD 3: BỘ TEST CASES KIỂM THỬ */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        3. Bộ Test Cases ({testCases.length} tests)
                      </h5>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {testCases.reduce((s, t) => s + (Number(t.points) || 0), 0)}đ tổng tests
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Visual Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{testCases.filter(t => !t.isHidden).length} test công khai</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">{testCases.filter(t => t.isHidden).length} test ẩn</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        <div
                          className="bg-orange-500 h-full transition-all"
                          style={{ width: `${testCases.length ? (testCases.filter(t => !t.isHidden).length / testCases.length) * 100 : 50}%` }}
                        />
                        <div
                          className="bg-slate-300 dark:bg-slate-600 h-full transition-all"
                          style={{ width: `${testCases.length ? (testCases.filter(t => t.isHidden).length / testCases.length) * 100 : 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Compact test cases peek */}
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {testCases.slice(0, 3).map((tc, idx) => (
                        <div key={tc.id} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-750 flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                            #{idx + 1}: In "{tc.input}" ➔ Out "{tc.expectedOutput}"
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{tc.points}đ</span>
                            {tc.isHidden ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">Ẩn</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">Công khai</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {testCases.length > 3 && (
                        <p className="text-[10px] text-center text-slate-400 italic">+ {testCases.length - 3} test case khác...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 4: BAREM RUBRIC & AI RAG */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        4. Rubric & AI RAG ({rubricCriteria.length} tiêu chí)
                      </h5>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {totalRubricScore === maxScore ? '✓ Khớp 100% điểm' : `${totalRubricScore}/${maxScore}đ`}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {rubricCriteria.map((rc, idx) => (
                        <div key={rc.id} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-750 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                            {idx + 1}. {rc.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">
                              {rc.method === 'ai_assessment' ? 'AI' : rc.method === 'test_runner' ? 'Test' : 'Hybrid'}
                            </span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">{rc.maxPoints}đ</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Benchmark Code:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sampleSolution ? '✓ Đã đính kèm code chuẩn' : 'Không đính kèm'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chế độ phát hành bài tập (Publish Mode Selector) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Send className="w-4 h-4 text-orange-500" />
                    Chế độ công bố bài tập
                  </label>
                  <span className="text-[11px] text-slate-400">Chọn trạng thái khả dụng cho sinh viên</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setPublishImmediately(true)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      publishImmediately
                        ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 ring-4 ring-orange-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-orange-500" />
                          Giao bài ngay (Khuyên dùng)
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold border-orange-300 text-orange-600 dark:text-orange-400">ĐÃ GIAO</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Bài tập công bố ngay lập tức. Toàn bộ sinh viên trong lớp nhận thông báo qua WebSocket và bắt đầu nộp bài.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishImmediately(false)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      !publishImmediately
                        ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 ring-4 ring-orange-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Clock className="w-5 h-5 text-slate-500" />
                          Lưu bản nháp
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-300 text-slate-600 dark:text-slate-400">BẢN NHÁP</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Chỉ giảng viên nhìn thấy đề bài trong Workspace. Sinh viên chưa nhìn thấy cho tới khi bạn bấm Giao bài.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep((currentStep - 1) as MainStep)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Hủy bỏ
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!title.trim()) { alert('Vui lòng nhập tên bài tập.'); return }
                      if (!classId) { alert('Vui lòng chọn lớp học.'); return }
                      setCurrentStep(2)
                    } else if (currentStep === 2) {
                      setCurrentStep(3)
                    }
                  }}
                  className="gap-1.5 text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-md shadow-orange-500/20"
                >
                  Tiếp theo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  onClick={handleCreateAssignment}
                  className="gap-2 text-xs bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold shadow-lg shadow-orange-500/25 px-5 h-9"
                >
                  <Check className="w-4 h-4" />
                  {publishImmediately ? 'Hoàn tất & Giao bài ngay' : 'Lưu bản nháp bài tập'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN: PRESTIGE LIVE PREVIEW (GÓC NHÌN SINH VIÊN & THÔNG SỐ)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 sticky top-2 space-y-3">
          {/* Preview Navigation Tabs */}
          <div className="flex items-center justify-between p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setPreviewTab('student')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                previewTab === 'student'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Góc nhìn sinh viên
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('system')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                previewTab === 'system'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Thông số kỹ thuật
            </button>
          </div>

          {/* TAB 1: GÓC NHÌN SINH VIÊN (AUTHENTIC LMS STUDENT CARD PREVIEW) */}
          {previewTab === 'student' ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden animate-in fade-in duration-200">
              {/* Brand Accent Top Bar (FPT Orange Gradient) */}
              <div className="h-2.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

              <div className="p-4 space-y-3.5">
                {/* Header with Class Pill & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-extrabold text-xs shadow-2xs">
                      {selectedClass?.subject?.code ? selectedClass.subject.code.slice(0, 3) : 'AIT'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {selectedClass ? `${selectedClass.classCode || selectedClass.code}` : 'Chưa chọn lớp'}
                        </p>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 font-mono">
                          {runtimeLanguage}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {selectedClass?.subject?.name || 'Môn học liên kết'}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={publishImmediately ? 'success' : 'default'}
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {publishImmediately ? 'Đang mở' : 'Bản nháp'}
                  </Badge>
                </div>

                {/* Assignment Title & Description Preview */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {title || 'Tiêu đề bài tập sẽ hiển thị ở đây...'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {description || 'Mô tả bài tập, yêu cầu cấu trúc code và các bài toán sinh viên cần hoàn thành...'}
                  </p>
                  {examFile && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                        <FileCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        Đề thi: {examFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{examFile.size}</span>
                    </div>
                  )}
                </div>

                {/* Format Chips & Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-[10px] font-semibold border border-orange-200/60 dark:border-orange-900/40 flex items-center gap-1">
                    {submissionType === 'single_file' ? <FileCode className="w-3 h-3" /> : <FileArchive className="w-3 h-3" />}
                    {submissionType === 'single_file' ? '1 file code' : 'Dự án ZIP'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                    {allowedFormats.join(', ')}
                  </span>
                  {entryFile && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                      Khởi chạy: {entryFile}
                    </span>
                  )}
                </div>

                {/* Deadline & Points Strip */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Hạn chót nộp bài</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-orange-500" />
                      {dueDate ? new Date(dueDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Không giới hạn'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Thang điểm</span>
                    <span className="font-extrabold text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5 text-xs">
                      <Award className="w-3.5 h-3.5" />
                      {maxScore || 10} điểm
                    </span>
                  </div>
                </div>

                {/* Mock Student Submission Dropzone */}
                <div className="p-3 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-800/60 bg-orange-50/20 dark:bg-orange-950/10 space-y-2 text-center">
                  <div className="w-7 h-7 mx-auto rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Khu vực nộp bài của sinh viên
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Kéo thả file ({allowedFormats.join(', ')}) hoặc click để nộp
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold shadow-xs opacity-90 cursor-not-allowed"
                  >
                    Nộp bài tập (Simulated Action)
                  </button>
                </div>

                {/* Attempt and Feedback note */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Số lần nộp: {allowResubmission ? (maxAttempts === 0 ? 'Tự do' : `${maxAttempts} lần`) : '1 lần'}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-500" /> AI Chấm theo Rubric
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: THÔNG SỐ KỸ THUẬT & TELEMETRY */
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-4 space-y-3.5 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-orange-500" />
                  Thông số hạ tầng Sandbox
                </span>
                <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                  Online
                </Badge>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hệ điều hành Sandbox:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Ubuntu 22.04 LTS (Isolated)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runtime:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{runtimeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giới hạn thời gian (CPU):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">2.0 giây / test</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giới hạn RAM:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">256 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Truy cập Internet:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">Bị chặn (Bảo mật tuyệt đối)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lệnh thực thi</span>
                  <p className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-1.5 rounded">
                    Build: {buildCommand || '(Thông dịch - Không cần build)'}
                  </p>
                  <p className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-1.5 rounded">
                    Run: {runCommand}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 space-y-1">
                  <span className="text-slate-700 dark:text-slate-300 font-bold block text-[10px] uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-500" /> Trạng thái RAG Pipeline
                  </span>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p>✓ Đề bài & Rubric: Sẵn sàng vector hóa</p>
                    <p>✓ Tài liệu tham khảo: {referenceMaterials ? 'Đã liên kết' : 'Mặc định chuẩn ngành'}</p>
                    {examFile && <p>✓ Đề thi đính kèm: {examFile.name}</p>}
                    <p>✓ Thuật toán so khớp: Cosine Similarity RAG</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Màu chủ đạo FPT Orange chuẩn nhận diện thương hiệu</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
