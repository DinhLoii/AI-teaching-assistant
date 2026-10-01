import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'
import { AiClientManager } from '../../../grading/engine/infrastructure/ai/AiClientManager.js'

export class GetAiHintUseCase implements IUseCase<{ submissionId: string; ruleScoreId: string; user: AuthUser }, { hint: string }> {
  async execute({ submissionId, ruleScoreId, user }: { submissionId: string; ruleScoreId: string; user: AuthUser }): Promise<{ hint: string }> {
    const submission = await prisma.submission.findUnique({
      where: { Id: submissionId },
      include: {
        Exam: true,
        SubmissionArtifact: true
      }
    })

    if (!submission) {
      throw new NotFoundError('Submission not found')
    }

    if (user.role === 'STUDENT' && submission.StudentId !== user.id) {
      throw new ForbiddenError('You can only request hints for your own submissions')
    }

    let rubricDescription = 'Unknown Rule'
    let aiReasoning = 'No specific reasoning provided'
    let snippetEvidence = ''

    const ruleScore = await prisma.ruleScore.findUnique({
      where: { Id: ruleScoreId },
      include: {
        RubricRule: true,
        ExecutionResult: true
      }
    })

    if (ruleScore) {
      rubricDescription = ruleScore.RubricRule?.Description || 'Unknown Rule'
      aiReasoning = ruleScore.AiReasoning || 'No specific reasoning provided'
    } else {
      // Fallback: Check in submission.ReportData (used by grading engine)
      const rawReport = submission.ReportData || (submission as any).reportData
      if (rawReport) {
        try {
          const report = typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport
          const allRules = [...(report?.failedRules || []), ...(report?.passedRules || [])]
          const matched = allRules.find((r: any) =>
            r.ruleId === ruleScoreId ||
            r.id === ruleScoreId ||
            String(r.title).toLowerCase().includes(String(ruleScoreId).toLowerCase())
          )
          if (matched) {
            rubricDescription = matched.title || matched.description || ruleScoreId
            aiReasoning = matched.details || matched.explanation || matched.reason || 'Tiêu chí chưa đạt điểm tối đa.'
            if (matched.evidence?.snippets?.length > 0) {
              snippetEvidence = matched.evidence.snippets.map((s: any) => `File: ${s.filePath || 'code'}\nLỗi: ${s.explanation || ''}\nCode: ${s.codeSnippet || ''}`).join('\n\n')
            }
          } else {
            rubricDescription = ruleScoreId
            aiReasoning = 'Tiêu chí cần cải thiện cấu trúc mã nguồn.'
          }
        } catch (e) {
          rubricDescription = ruleScoreId
        }
      } else {
        throw new NotFoundError('Rule score or evaluation criteria not found')
      }
    }

    const systemPrompt = `Bạn là một trợ lý giảng dạy (Senior Developer). 
Sinh viên đã làm sai bài tập ở tiêu chí: "${rubricDescription}".
Lý do AI chấm điểm trừ là: "${aiReasoning}".
${snippetEvidence ? `Đoạn mã / ngữ cảnh liên quan:\n${snippetEvidence}\n` : ''}
Nhiệm vụ của bạn:
1. Giải thích ngắn gọn lỗi này nghĩa là gì.
2. Đưa ra gợi ý (hints) để sinh viên tự sửa lỗi.
TUYỆT ĐỐI KHÔNG cung cấp toàn bộ code giải hoàn chỉnh. Chỉ đưa ra hướng dẫn tư duy hoặc ví dụ minh họa chung chung.`

    try {
      const response = await AiClientManager.executeWithFallback(async (client, model) => {
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.7
        });
      });
      const hint = response.choices[0]?.message?.content || 'Hệ thống không thể tạo gợi ý lúc này.';
      return { hint }
    } catch (error) {
      console.error('Failed to generate AI hint:', error)
      return { hint: 'Hệ thống AI hiện đang bận hoặc chưa được cấu hình. Vui lòng thử lại sau.' }
    }
  }
}
