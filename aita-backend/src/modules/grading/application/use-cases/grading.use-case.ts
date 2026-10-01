import { IGradingRepository } from '../../domain/repositories/grading-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { container } from '../../../../shared/infrastructure/di-container.js'
import { globalAssignmentRepository } from '../../engine/assignment/PublishedAssignmentRepository.js'
import { globalJobManager } from '../../engine/application/queue/SubmissionJobManager.js'
import { extractZipAsync } from '../../engine/shared/helpers/unzipHelper.js'
import { SubmissionState } from '../../engine/core/domain/submission/SubmissionState.js'
import fs from 'fs/promises'
import path from 'path'

export class GetGradingSessionStatusUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { }

    async execute(sessionId: string) {
        const session = await this.gradingRepo.getSession(sessionId)
        if (!session) throw new NotFoundError(MESSAGES.GRADING_SESSION_NOT_FOUND)

        const jobs = await this.gradingRepo.findJobsBySession(sessionId)
        return { ...session, jobs }
    }
}

export class StartGradingSessionUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { 
        (this.gradingRepo as any); // Prevent TS unused variable error
    }

    async execute(assignmentId: string) {
        // Fetch assignment metadata from the engine
        const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId)
        if (!publishedAssignment) {
            throw new NotFoundError('Assignment chưa được publish hoặc không tồn tại trong Engine.')
        }

        // Fetch all pending submissions for this assignment from Prisma
        const uow = container.get<any>(Symbol.for('UnitOfWork'))
        const submissionRepo = uow.resolve(Symbol.for('SubmissionRepository'))
        const pendingSubmissions = await submissionRepo.findMany({ examId: assignmentId })
        // Filter those that need grading (e.g. status isn't graded)
        // Here we just grade all of them for this batch session, or filter by Pending if your domain supports it.
        const toGrade = pendingSubmissions.filter((s: any) => s.status !== 'graded')

        if (toGrade.length === 0) {
            throw new Error('Không có bài nộp nào đang chờ chấm.')
        }

        // Get the engine's SubmissionController instance to reuse its enqueue method
        const { engineSubmissionController } = await import('../../engine/modules/submissions/routes/index.js')
        if (!engineSubmissionController) throw new Error('Engine controller is not initialized.')

        for (const sub of toGrade) {
            if (!sub.zipFileUrl) continue;

            const extractDir = path.join(process.cwd(), 'temp', 'submissions', sub.id)
            await fs.mkdir(extractDir, { recursive: true })
            const zipPath = path.join(process.cwd(), 'temp', `temp_${sub.id}.zip`)

            try {
                // Download file from Cloudinary (or any URL)
                const response = await fetch(sub.zipFileUrl)
                if (!response.ok) throw new Error(`Failed to download ${sub.zipFileUrl}`)
                
                const arrayBuffer = await response.arrayBuffer()
                await fs.writeFile(zipPath, Buffer.from(arrayBuffer))

                // Extract
                await extractZipAsync(zipPath, extractDir)
                
                // Cleanup temp zip
                await fs.unlink(zipPath).catch(() => {})

                // Enqueue
                globalJobManager.initJob(sub.id)
                
                const engineSubmission = {
                    id: sub.id,
                    assignmentId: publishedAssignment.id,
                    studentId: sub.studentId,
                    sourceCodeUri: extractDir, // The directory, not the zip
                    currentState: SubmissionState.Queued,
                    statusHistory: []
                }

                engineSubmissionController.enqueueSubmissionJob(sub.id, publishedAssignment, engineSubmission, extractDir)

            } catch (err: any) {
                console.error(`Failed to process submission ${sub.id}:`, err)
                // Depending on requirements, we can mark it as Failed in DB immediately
            }
        }
        
        return { message: `Đã đưa ${toGrade.length} bài nộp vào hàng đợi chấm điểm.` }
    }
}
