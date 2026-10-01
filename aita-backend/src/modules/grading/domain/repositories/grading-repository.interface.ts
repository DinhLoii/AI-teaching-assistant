import { GradingJob } from '../entities/grading-job.entity.js'
import { GradingSession } from '../entities/grading-session.entity.js'

export interface IGradingRepository {
    createSession(session: GradingSession): Promise<void>
    getSession(id: string): Promise<GradingSession | null>
    saveSession(session: GradingSession): Promise<void>

    createJob(job: GradingJob): Promise<void>
    getJob(id: string): Promise<GradingJob | null>
    saveJob(job: GradingJob): Promise<void>
    findJobsBySession(sessionId: string): Promise<GradingJob[]>
}
