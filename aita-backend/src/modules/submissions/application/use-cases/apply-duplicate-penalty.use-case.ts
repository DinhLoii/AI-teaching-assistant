import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'

export type DuplicatePenaltyType = 'NONE' | 'FLAT_POINTS' | 'PERCENT' | 'ZERO_SCORE'

export interface ApplyDuplicatePenaltyDto {
  assignmentId: string
  submissionIds: string[]
  penaltyType: DuplicatePenaltyType
  penaltyValue: number
  reason?: string
}

export interface ApplyDuplicatePenaltyResult {
  success: boolean
  updatedCount: number
  updatedSubmissions: Array<{
    id: string
    studentName: string | null
    oldScore: number | null
    newScore: number
    deductedPoints: number
  }>
}

export class ApplyDuplicatePenaltyUseCase implements IUseCase<
  { dto: ApplyDuplicatePenaltyDto; user: AuthUser },
  ApplyDuplicatePenaltyResult
> {
  async execute({
    dto,
    user
  }: {
    dto: ApplyDuplicatePenaltyDto
    user: AuthUser
  }): Promise<ApplyDuplicatePenaltyResult> {
    if (!dto.assignmentId) throw new ValidationError('assignmentId là bắt buộc')
    if (!dto.submissionIds || !Array.isArray(dto.submissionIds) || dto.submissionIds.length === 0) {
      throw new ValidationError('submissionIds phải là mảng không rỗng')
    }
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Chỉ giảng viên hoặc quản trị viên mới có quyền áp dụng trừ điểm bài trùng lặp')
    }

    const exam = await prisma.exam.findUnique({
      where: { Id: dto.assignmentId },
      select: { Id: true, Title: true }
    })
    if (!exam) throw new NotFoundError('Không tìm thấy bài tập/đề thi')

    const penaltyType = dto.penaltyType || 'FLAT_POINTS'
    const penaltyValue = Number(dto.penaltyValue) || 0

    // Fetch the target submissions
    const submissions = await prisma.submission.findMany({
      where: {
        Id: { in: dto.submissionIds },
        ExamId: dto.assignmentId
      },
      select: {
        Id: true,
        StudentId: true,
        RawScore: true,
        TotalScore: true,
        FinalScore: true,
        InstructorFeedback: true,
        ReportData: true,
        User_Submission_StudentIdToUser: {
          select: { FullName: true, StudentCode: true }
        }
      }
    })

    if (submissions.length === 0) {
      throw new NotFoundError('Không tìm thấy bài nộp nào phù hợp để trừ điểm')
    }

    const updatedSubmissions: ApplyDuplicatePenaltyResult['updatedSubmissions'] = []

    for (const sub of submissions) {
      // Check if this submission has already been penalized for duplicate / plagiarism
      const ifb = sub.InstructorFeedback || ''
      const rd = sub.ReportData || ''
      const isAlreadyPenalized = Boolean(
        ifb.includes('[Trừ điểm trùng lặp') ||
        ifb.includes('[Plagiarism') ||
        rd.includes('Trừ điểm trùng lặp') ||
        rd.includes('Plagiarism Penalty')
      )

      // Prevent double deduction: If already penalized in previous runs, skip completely
      if (isAlreadyPenalized) {
        continue
      }

      // Determine original base score
      const originalScore = sub.RawScore !== null && sub.RawScore !== undefined
        ? Number(sub.RawScore)
        : (sub.FinalScore !== null && sub.FinalScore !== undefined ? Number(sub.FinalScore) : (sub.TotalScore ? Number(sub.TotalScore) : 10))

      let newScore = originalScore
      let deductedPoints = 0

      if (penaltyType === 'ZERO_SCORE') {
        deductedPoints = originalScore
        newScore = 0
      } else if (penaltyType === 'PERCENT') {
        const pct = Math.min(100, Math.max(0, penaltyValue))
        deductedPoints = Number((originalScore * (pct / 100)).toFixed(2))
        newScore = Number(Math.max(0, originalScore - deductedPoints).toFixed(2))
      } else if (penaltyType === 'FLAT_POINTS') {
        deductedPoints = Math.min(originalScore, Math.max(0, penaltyValue))
        newScore = Number(Math.max(0, originalScore - deductedPoints).toFixed(2))
      }

      // Build detailed feedback note explaining why points were deducted
      const penaltyDesc = penaltyType === 'ZERO_SCORE'
        ? 'hủy bài làm (về 0 điểm)'
        : penaltyType === 'PERCENT'
          ? `trừ ${penaltyValue}% điểm (-${deductedPoints}đ)`
          : `trừ cố định ${deductedPoints} điểm`

      const penaltyNote = `[Trừ điểm trùng lặp / Plagiarism]: Đã áp dụng ${penaltyDesc}. Điểm gốc: ${originalScore}đ -> Điểm công bố: ${newScore}đ. Lý do: Phát hiện nội dung mã nguồn trùng lặp với bài nộp khác trong cùng bài tập.`

      const existingFeedback = sub.InstructorFeedback ? sub.InstructorFeedback.trim() : ''
      const updatedFeedback = existingFeedback
        ? (existingFeedback.includes('[Trừ điểm trùng lặp') || existingFeedback.includes('[Plagiarism')
          ? existingFeedback.replace(/\[(?:Trừ điểm trùng lặp|Plagiarism)[^\]]*\]:[^\n]*/g, penaltyNote)
          : `${existingFeedback}\n\n${penaltyNote}`)
        : penaltyNote

      // Update ReportData JSON for AI feedback & score synchronization
      let updatedReportData: string | null = null
      const aiDuplicateNote = `\n\n> ⚠️ **Lưu ý đánh giá từ AI (Trừ điểm trùng lặp / Plagiarism Penalty)**:\n> - **Lý do bị trừ điểm / Reason**: Phát hiện nội dung mã nguồn bài làm có mức độ tương đồng/trùng lặp cao với bài nộp khác trong cùng bài tập (High source code similarity detected with other submissions).\n> - **Mức phạt áp dụng / Applied Penalty**: Đã ${penaltyDesc} (Điểm gốc / Original: **${originalScore}**đ ➔ Điểm cuối cùng công bố / Final: **${newScore}**đ).\n> - **Quy định / Academic Integrity**: Sinh viên cần nghiêm túc tuân thủ tính trung thực học thuật và tự viết mã nguồn độc lập (Students must maintain academic integrity and write code independently).`

      if (sub.ReportData) {
        try {
          const parsedReport = JSON.parse(sub.ReportData)
          parsedReport.totalScore = newScore
          let currentOverall = parsedReport.overallFeedback || ''
          if (currentOverall.includes('Lưu ý đánh giá từ AI') || currentOverall.includes('Lưu ý chống gian lận & Trùng lặp')) {
            currentOverall = currentOverall.replace(/> ⚠️ \*\*Lưu ý[^\n]*\n(?:> [^\n]*\n?)*/g, aiDuplicateNote.trim())
          } else {
            currentOverall = `${currentOverall}${aiDuplicateNote}`
          }
          parsedReport.overallFeedback = currentOverall
          updatedReportData = JSON.stringify(parsedReport)
        } catch (e) { }
      }

      await prisma.submission.update({
        where: { Id: sub.Id },
        data: {
          RawScore: sub.RawScore !== null && sub.RawScore !== undefined ? sub.RawScore : originalScore,
          TotalScore: newScore,
          FinalScore: newScore,
          InstructorFeedback: updatedFeedback,
          ...(updatedReportData ? { ReportData: updatedReportData } : {}),
          ReviewedBy: user.id,
          ReviewedAt: new Date()
        }
      })

      updatedSubmissions.push({
        id: sub.Id,
        studentName: sub.User_Submission_StudentIdToUser?.FullName || sub.StudentId,
        oldScore: originalScore,
        newScore,
        deductedPoints
      })
    }

    return {
      success: true,
      updatedCount: updatedSubmissions.length,
      updatedSubmissions
    }
  }
}
