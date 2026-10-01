import { gradingApi as api } from '@/lib/api/modules/grading'
import { cleanAssignmentHtml } from '@/utils/htmlCleaner'

export interface AiGenerationResult {
  content: string
  rubric: any
  blueprint: any
  metadata: any
  step: 1 | 2 | 3
}

export interface AiGenerationState {
  isGenerating: boolean
  loadingMsg: string
  progress: number
  result: AiGenerationResult | null
  error: string | null
  selectedSemester?: string
  subjectCode?: string
  assignmentType?: string
  textPrompt?: string
  isCompleted: boolean
  pageImages?: string[]
}

type Listener = (state: AiGenerationState) => void

class AiGenerationStoreManager {
  private state: AiGenerationState = {
    isGenerating: false,
    loadingMsg: '',
    progress: 0,
    result: null,
    error: null,
    isCompleted: false,
  }

  private listeners: Set<Listener> = new Set()
  private abortController: AbortController | null = null

  getState(): AiGenerationState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(partial: Partial<AiGenerationState>) {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((l) => l(this.state))
  }

  clearCompleted() {
    this.setState({
      isCompleted: false,
    })
  }

  cancelGeneration() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.setState({
      isGenerating: false,
      loadingMsg: '',
      progress: 0,
      error: null,
      isCompleted: false,
    })
  }

  reset() {
    this.cancelGeneration()
    this.setState({
      result: null,
      selectedSemester: undefined,
      subjectCode: undefined,
      assignmentType: undefined,
      textPrompt: undefined,
      isCompleted: false,
    })
  }

  async startGeneration(
    textPrompt: string,
    selectedSemester: string,
    subjectCode: string,
    assignmentType?: string
  ) {
    this.cancelGeneration()
    this.abortController = new AbortController()

    this.setState({
      isGenerating: true,
      loadingMsg: 'AITA đang tạo nội dung đề bài bằng AI...',
      progress: 20,
      error: null,
      result: null,
      isCompleted: false,
      selectedSemester,
      subjectCode,
      assignmentType,
      textPrompt,
    })

    try {
      const promptHeader = [
        subjectCode ? `Subject: ${subjectCode}` : '',
        assignmentType ? `Assignment type: ${assignmentType}` : '',
      ].filter(Boolean).join('\n')
      const finalPrompt = promptHeader ? `${promptHeader}\n\n${textPrompt}` : textPrompt
      const markdown = await api.generateContent(finalPrompt, selectedSemester, subjectCode, {
        signal: this.abortController.signal,
      })

      this.setState({
        loadingMsg: 'Đang phân tích cấu trúc đề bài & trích xuất tiêu chí chấm...',
        progress: 50,
      })
      const draftBlueprint = await api.parseRequirements(markdown, null, subjectCode)

      this.setState({
        loadingMsg: 'Đang chạy tính toán barem rubric & sinh test cases...',
        progress: 80,
      })
      const generatedRubric = await api.generateRubric(draftBlueprint)

      let finalMarkdown = markdown
      if (draftBlueprint.projectType === 'algorithm') {
        const ioRule = generatedRubric.rules?.find((r: any) => r.scoringStrategy === 'StdInOutProbe')
        const testCases = ioRule?.requiredEvidence?.[0]?.stdInOutProbe?.testCases
        if (testCases && testCases.length > 0) {
          finalMarkdown += `<br/><h3>Expected Behavior (Test Cases)</h3><ul>`
          testCases.forEach((tc: any, idx: number) => {
            finalMarkdown += `<li><strong>Test Case ${idx + 1}:</strong><br/>Input:<pre>${tc.input}</pre>Output:<pre>${tc.expectedOutput}</pre></li><br/>`
          })
          finalMarkdown += `</ul>`
        }
      }

      const result: AiGenerationResult = {
        content: cleanAssignmentHtml(finalMarkdown),
        rubric: generatedRubric,
        blueprint: draftBlueprint,
        metadata: {
          title: draftBlueprint.assignmentTitle || 'AI Generated Assignment',
          description: draftBlueprint.description || '',
          projectType: draftBlueprint.projectType || 'backend',
          subject: subjectCode || draftBlueprint.subject || '',
          category: assignmentType || 'Assignment',
        },
        step: 2,
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        progress: 100,
        result,
        isCompleted: true,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        progress: 0,
        error: err.response?.data?.error || err.message || 'Không thể tạo đề bài bằng AI',
        isCompleted: false,
      })
    }
  }

  async startFileGeneration(file: File, selectedSemester: string, subjectCode: string, assignmentType?: string) {
    this.cancelGeneration()
    this.abortController = new AbortController()

    this.setState({
      isGenerating: true,
      loadingMsg: `Đang đọc và trích xuất nội dung từ tập tin ${file.name}...`,
      progress: 15,
      error: null,
      result: null,
      isCompleted: false,
      selectedSemester,
      subjectCode,
      assignmentType,
      pageImages: [],
    })

    try {
      let pageImages: string[] = []
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          this.setState({ loadingMsg: 'Đang trích xuất hình ảnh các trang PDF cho AI Vision...', progress: 20 })
          const { renderPdfToImages } = await import('@/lib/pdf')
          pageImages = await renderPdfToImages(file, 0.9, 30)
          this.setState({
            pageImages,
            loadingMsg: `Đã trích xuất ${file.name} (${pageImages.length} trang) thành công. Đang phân tích...`,
            progress: 35,
          })
        } catch (pdfErr) {
          console.warn('[AiGenerationStore] PDF page rendering warning, falling back to text extraction:', pdfErr)
        }
      }

      const extractedData: any = await api.extractText(file, selectedSemester, subjectCode)
      const extractedText = (extractedData?.text?.rawText && extractedData.text.rawText.trim().length > 0)
        ? extractedData.text.rawText
        : (typeof extractedData?.text === 'string' && extractedData.text.trim().length > 0
          ? extractedData.text
          : (extractedData?.rawText || ''))

      this.setState({
        loadingMsg: 'AITA đang tạo cấu trúc bài tập từ tài liệu trích xuất...',
        progress: 45,
      })
      const promptHeader = [
        subjectCode ? `Subject: ${subjectCode}` : '',
        assignmentType ? `Assignment type: ${assignmentType}` : '',
      ].filter(Boolean).join('\n')
      const finalPrompt = promptHeader ? `${promptHeader}\n\n${extractedText}` : extractedText
      const markdown = await api.generateContent(finalPrompt, selectedSemester, subjectCode, {
        signal: this.abortController.signal,
        pageImages: pageImages.length > 0 ? pageImages : undefined,
      })

      this.setState({
        loadingMsg: 'Đang phân tích yêu cầu & thiết lập quy tắc rubric...',
        progress: 70,
      })
      const draftBlueprint = await api.parseRequirements(markdown, null, subjectCode)
      const generatedRubric = await api.generateRubric(draftBlueprint)

      let finalMarkdown = markdown
      if (draftBlueprint.projectType === 'algorithm') {
        const ioRule = generatedRubric.rules?.find((r: any) => r.scoringStrategy === 'StdInOutProbe')
        const testCases = ioRule?.requiredEvidence?.[0]?.stdInOutProbe?.testCases
        if (testCases && testCases.length > 0) {
          finalMarkdown += `<br/><h3>Expected Behavior (Test Cases)</h3><ul>`
          testCases.forEach((tc: any, idx: number) => {
            finalMarkdown += `<li><strong>Test Case ${idx + 1}:</strong><br/>Input:<pre>${tc.input}</pre>Output:<pre>${tc.expectedOutput}</pre></li><br/>`
          })
          finalMarkdown += `</ul>`
        }
      }

      const result: AiGenerationResult = {
        content: cleanAssignmentHtml(finalMarkdown),
        rubric: generatedRubric,
        blueprint: draftBlueprint,
        metadata: {
          title: draftBlueprint.assignmentTitle || 'AI Generated Assignment',
          description: draftBlueprint.description || '',
          projectType: draftBlueprint.projectType || 'backend',
          subject: subjectCode || draftBlueprint.subject || '',
          category: assignmentType || 'Assignment',
        },
        step: 2,
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        progress: 100,
        result,
        isCompleted: true,
      })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        progress: 0,
        error: err.response?.data?.error || err.message || 'Không thể trích xuất & tạo đề bài từ tập tin',
        isCompleted: false,
      })
    }
  }
}

export const aiGenerationStore = new AiGenerationStoreManager()
