import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

import { prisma } from '../../../../database/prisma.js'
import { examTestCasesView } from '../exam-criteria-view.js'
import { examConfiguration } from '../../../submissions/application/submission-language.js'

export class GetExamUseCase implements IUseCase<string, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) {}

  /**
   * @param viewerId optional id of the requesting user. When that user is enrolled in one of
   *   the exam's classes, the lecturer shown is the one teaching *their* class rather than
   *   whichever class happens to be attached first. Omitting it keeps the previous behaviour,
   *   which is what lecturers and admins continue to get.
   */
  async execute(id: string, viewerId?: string, viewerRole?: string): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    if (viewerId) {
      const ownClass = ((exam as any).classLecturers ?? []).find(
        (c: any) => c.lecturer && Array.isArray(c.studentIds) && c.studentIds.includes(viewerId)
      )
      if (ownClass) {
        (exam as any).lecturer = ownClass.lecturer;
        (exam as any).lecturerAvatar = ownClass.lecturerAvatar;
      }
    }

    // An exam is not always attached to a class (ExamClass can be empty), yet the student is
    // still enrolled in a class for its subject and has a real lecturer there — which is why
    // the subject list showed a name and photo while this screen said "Not assigned". Resolve
    // it the same way the subject list does (student's enrolments -> class -> instructor) so
    // the two screens can no longer disagree. Only fills a blank; never overrides the above.
    if (viewerId && (!(exam as any).lecturer || (exam as any).lecturer === 'Not assigned')) {
      const subjectId = (exam as any).subjectId || (exam as any).SubjectId
      const subjectCode = (exam as any).subjectCode

      const whereOr = [
        subjectId ? { SubjectId: subjectId } : null,
        subjectCode ? { Subject: { SubjectCode: subjectCode } } : null
      ].filter(Boolean)

      const enrolledClass = await prisma.class.findFirst({
        where: {
          StudentClass: { some: { UserId: viewerId } },
          InstructorClass: { some: {} },
          ...(whereOr.length > 0 ? { OR: whereOr as any } : {})
        },
        include: { InstructorClass: { include: { User: true } } }
      })
      const instructor = enrolledClass?.InstructorClass?.[0]?.User
      if (instructor) {
        (exam as any).lecturer = instructor.FullName;
        (exam as any).lecturerAvatar = instructor.Avatar;
      }
    }

    // Attempt to load the AI-generated rubric if it exists
    try {
      const published = await prisma.publishedAssignment.findUnique({
        where: { Id: id }
      })
      
      if (published && published.Data) {
        const data = JSON.parse(published.Data)
        if (data.metadata?.content) {
          (exam as any).content = data.metadata.content;
        }
        if (data.rubric && Array.isArray(data.rubric.rules) && data.rubric.rules.length > 0) {
          (exam as any).passThreshold = data.rubric.passThreshold !== undefined ? Number(data.rubric.passThreshold) : 0.7;
          (exam as any).rubric = data.rubric;
          // Extract sqlSetupScript if available
          for (const rule of data.rubric.rules) {
            if (rule.requiredEvidence && Array.isArray(rule.requiredEvidence)) {
              for (const ev of rule.requiredEvidence) {
                if (ev?.sqlProbe?.setupScript && typeof ev.sqlProbe.setupScript === 'string' && ev.sqlProbe.setupScript.trim().length > 0) {
                  (exam as any).sqlSetupScript = ev.sqlProbe.setupScript.trim();
                  break;
                }
              }
            }
            if ((exam as any).sqlSetupScript) break;
          }

          // Map AI rubric to DTO format
          (exam as any).aiRubrics = data.rubric.rules.map((rule: any) => ({
            id: rule.id,
            title: rule.title || rule.criteria || rule.description || 'Tiêu chí',
            name: rule.title || rule.criteria || rule.description || 'Tiêu chí',
            description: rule.description || rule.criteria || '',
            maxPoints: Number(rule.weight ?? rule.maxPoints) || 0,
            weight: Number(rule.weight ?? rule.maxPoints) || 0,
            scoringStrategy: rule.scoringStrategy || 'Manual',
            requiredEvidence: rule.requiredEvidence,
            criteria: rule.levels ? rule.levels.map((level: any) => ({
              id: level.id,
              description: level.description,
              maxPoints: Number(level.score) || 0
            })) : []
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching PublishedAssignment:', err)
    }
    
    const dto = ExamResponseDto.from(exam as any)
    const config = examConfiguration(exam as any)
    const staff = ['ADMIN', 'LECTURER'].includes(String(viewerRole || '').toUpperCase())
    const storedTests = (exam as any).TestCase
    ;(dto as any).testCases = examTestCasesView(storedTests?.length ? storedTests : config.testCases || [], staff)
    ;(dto as any).runtimeLanguage = config.submissionFormat?.requiredLanguage || config.runtimeConfig?.language || null
    return dto
  }
}
