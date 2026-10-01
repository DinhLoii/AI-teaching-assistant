import { createHash } from 'crypto'
import path from 'path'
import fs from 'fs'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'
import {
  extractCorpus,
  normalizeSource,
  fingerprint,
  similarityPercent,
} from '../services/submission-similarity.service.js'

export interface DuplicateClusterMember {
  submissionId: string
  studentId: string | null
  studentName: string | null
  studentCode: string | null
  attemptNumber: number | null
  submittedAt: Date | null
  zipFileUrl: string | null
  /** Highest similarity this member reaches against anyone else in its cluster. */
  topSimilarity: number
  isPenalized: boolean
  matchedWith?: Array<{
    submissionId: string
    studentName: string | null
    studentCode: string | null
    isPenalized: boolean
    similarity: number
  }>
}

export interface DuplicatePair {
  submissionIdA: string
  submissionIdB: string
  studentNameA: string | null
  studentNameB: string | null
  /** 0-100. 100 together with `identical` means the stored files are byte-for-byte equal. */
  similarity: number
  identical: boolean
}

export interface DuplicateCluster {
  count: number
  pendingCount: number
  isResolved: boolean
  /** Highest pair similarity inside the cluster — what the UI leads with. */
  maxSimilarity: number
  /** True when every member of the cluster is a byte-for-byte copy. */
  allIdentical: boolean
  submissions: DuplicateClusterMember[]
  pendingSubmissions?: DuplicateClusterMember[]
  penalizedReferenceMembers?: DuplicateClusterMember[]
  pairs: DuplicatePair[]
}

export interface DetectDuplicatesResult {
  assignmentId: string
  checkedCount: number
  failedCount: number
  failedSubmissionIds: string[]
  /** Submissions read fine but held no comparable source text (e.g. an archive of images). */
  emptyCount: number
  threshold: number
  pendingCount: number
  resolvedClustersCount: number
  clusters: DuplicateCluster[]
}

// Downloads are bounded so one giant assignment can't hold every DB/HTTP
// resource at once, and one unreachable file must not sink the whole report.
const DOWNLOAD_CONCURRENCY = 5

/** Default reporting threshold, in percent. Overridable per request. */
const DEFAULT_THRESHOLD = 80

interface Candidate {
  submissionId: string
  studentId: string | null
  studentName: string | null
  studentCode: string | null
  attemptNumber: number | null
  submittedAt: Date | null
  zipFileUrl: string | null
  exactHash: string
  prints: Set<number>
  isPenalized: boolean
}

export class DetectDuplicateSubmissionsUseCase implements IUseCase<{ assignmentId: string; user: AuthUser; threshold?: number }, DetectDuplicatesResult> {
  async execute({ assignmentId, user, threshold }: { assignmentId: string; user: AuthUser; threshold?: number }): Promise<DetectDuplicatesResult> {
    if (!assignmentId) throw new ValidationError('assignmentId là bắt buộc')
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Chỉ giảng viên hoặc quản trị viên được kiểm tra trùng bài')
    }

    const minSimilarity = Number.isFinite(threshold) ? Math.min(100, Math.max(1, Number(threshold))) : DEFAULT_THRESHOLD

    const exam = await prisma.exam.findUnique({
      where: { Id: assignmentId },
      select: { Id: true },
    })
    if (!exam) throw new NotFoundError('Không tìm thấy bài tập/đề thi')

    const submissions = await prisma.submission.findMany({
      where: {
        ExamId: assignmentId,
        IsLatest: true,
        ZipFileUrl: { not: null },
      },
      select: {
        Id: true,
        StudentId: true,
        AttemptNumber: true,
        SubmittedAt: true,
        ZipFileUrl: true,
        InstructorFeedback: true,
        ReportData: true,
        User_Submission_StudentIdToUser: {
          select: { Id: true, FullName: true, StudentCode: true, Email: true },
        },
      },
    })

    // Fallback user lookup for any submission where direct relation didn't populate FullName/StudentCode
    const missingStudentIds = Array.from(
      new Set(
        submissions
          .filter(s => (!s.User_Submission_StudentIdToUser?.FullName || !s.User_Submission_StudentIdToUser?.StudentCode) && s.StudentId)
          .map(s => s.StudentId!)
      )
    )

    const fallbackUsers = missingStudentIds.length > 0
      ? await prisma.user.findMany({
          where: {
            OR: [
              { Id: { in: missingStudentIds } },
              { StudentCode: { in: missingStudentIds } },
              { Email: { in: missingStudentIds } },
            ]
          },
          select: { Id: true, FullName: true, StudentCode: true, Email: true }
        })
      : []

    const userLookupMap = new Map<string, { Id: string; FullName: string | null; StudentCode: string | null; Email: string | null }>()
    for (const u of fallbackUsers) {
      if (u.Id) userLookupMap.set(u.Id, u)
      if (u.StudentCode) userLookupMap.set(u.StudentCode, u)
      if (u.Email) userLookupMap.set(u.Email, u)
    }

    const candidates: Candidate[] = []
    const failedSubmissionIds: string[] = []
    let emptyCount = 0

    for (let i = 0; i < submissions.length; i += DOWNLOAD_CONCURRENCY) {
      const batch = submissions.slice(i, i + DOWNLOAD_CONCURRENCY)
      const analysed = await Promise.all(batch.map(async (submission) => ({
        submission,
        analysis: await this.analyse(submission.ZipFileUrl!),
      })))

      for (const { submission, analysis } of analysed) {
        if (!analysis) {
          failedSubmissionIds.push(submission.Id)
          continue
        }
        if (!analysis.prints) {
          emptyCount++
          continue
        }

        const ifb = submission.InstructorFeedback || ''
        const rd = submission.ReportData || ''
        const isPenalized = Boolean(
          ifb.includes('[Trừ điểm trùng lặp') ||
          ifb.includes('[Plagiarism') ||
          rd.includes('Trừ điểm trùng lặp') ||
          rd.includes('Plagiarism Penalty')
        )

        let studentName =
          submission.User_Submission_StudentIdToUser?.FullName ||
          submission.User_Submission_StudentIdToUser?.Email ||
          null
        let studentCode = submission.User_Submission_StudentIdToUser?.StudentCode || null

        // Try lookup in fallback user map
        if ((!studentName || !studentCode) && submission.StudentId) {
          const fallback = userLookupMap.get(submission.StudentId)
          if (fallback) {
            studentName = studentName || fallback.FullName || fallback.Email || null
            studentCode = studentCode || fallback.StudentCode || null
          }
        }

        // Try parsing ReportData metadata
        if (!studentName || !studentCode) {
          if (submission.ReportData) {
            try {
              const parsed = typeof submission.ReportData === 'string' ? JSON.parse(submission.ReportData) : submission.ReportData
              studentName = studentName || parsed.studentName || parsed.__metadata?.studentName || parsed.student?.name || null
              studentCode = studentCode || parsed.studentCode || parsed.__metadata?.studentCode || parsed.studentId || parsed.student?.code || null
            } catch (e) {}
          }
        }

        candidates.push({
          submissionId: submission.Id,
          studentId: submission.StudentId,
          studentName,
          studentCode,
          attemptNumber: submission.AttemptNumber,
          submittedAt: submission.SubmittedAt,
          zipFileUrl: submission.ZipFileUrl,
          exactHash: analysis.exactHash,
          prints: analysis.prints,
          isPenalized,
        })
      }
    }

    const clusters = this.buildClusters(candidates, minSimilarity)
    const pendingCount = clusters.reduce((sum, c) => sum + (c.pendingCount || 0), 0)
    const resolvedClustersCount = clusters.filter(c => c.isResolved).length

    return {
      assignmentId,
      checkedCount: candidates.length,
      failedCount: failedSubmissionIds.length,
      failedSubmissionIds,
      emptyCount,
      threshold: minSimilarity,
      pendingCount,
      resolvedClustersCount,
      clusters,
    }
  }

  /**
   * Compare every pair once, keep the ones at or above the threshold, then merge
   * overlapping pairs into clusters so multiple students sharing one source show up as
   * a single group rather than separate disconnected pairs.
   */
  private buildClusters(candidates: Candidate[], minSimilarity: number): DuplicateCluster[] {
    const parent = candidates.map((_, idx) => idx)
    const find = (x: number): number => {
      let root = x
      while (parent[root] !== root) root = parent[root]
      while (parent[x] !== root) { const next = parent[x]; parent[x] = root; x = next }
      return root
    }
    const union = (a: number, b: number) => {
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent[rb] = ra
    }

    const hits: Array<{ a: number; b: number; similarity: number; identical: boolean }> = []

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        // The same student's own resubmission is not an exchange.
        if (candidates[i].studentId && candidates[i].studentId === candidates[j].studentId) continue

        const identical = candidates[i].exactHash === candidates[j].exactHash
        const similarity = identical ? 100 : similarityPercent(candidates[i].prints, candidates[j].prints)
        if (similarity < minSimilarity) continue

        hits.push({ a: i, b: j, similarity, identical })
        union(i, j)
      }
    }

    const byRoot = new Map<number, { members: Set<number>; pairs: typeof hits }>()
    for (const hit of hits) {
      const root = find(hit.a)
      const bucket = byRoot.get(root) ?? { members: new Set<number>(), pairs: [] }
      bucket.members.add(hit.a)
      bucket.members.add(hit.b)
      bucket.pairs.push(hit)
      byRoot.set(root, bucket)
    }

    const clusters: DuplicateCluster[] = []
    for (const bucket of byRoot.values()) {
      const best = new Map<number, number>()
      for (const pair of bucket.pairs) {
        best.set(pair.a, Math.max(best.get(pair.a) ?? 0, pair.similarity))
        best.set(pair.b, Math.max(best.get(pair.b) ?? 0, pair.similarity))
      }

      const members: DuplicateClusterMember[] = [...bucket.members]
        .map(idx => {
          const matchedWith = bucket.pairs
            .filter(p => p.a === idx || p.b === idx)
            .map(p => {
              const otherIdx = p.a === idx ? p.b : p.a
              return {
                submissionId: candidates[otherIdx].submissionId,
                studentName: candidates[otherIdx].studentName,
                studentCode: candidates[otherIdx].studentCode,
                isPenalized: candidates[otherIdx].isPenalized,
                similarity: p.similarity,
              }
            })
            .sort((a, b) => b.similarity - a.similarity)

          return {
            submissionId: candidates[idx].submissionId,
            studentId: candidates[idx].studentId,
            studentName: candidates[idx].studentName,
            studentCode: candidates[idx].studentCode,
            attemptNumber: candidates[idx].attemptNumber,
            submittedAt: candidates[idx].submittedAt,
            zipFileUrl: candidates[idx].zipFileUrl,
            topSimilarity: best.get(idx) ?? 0,
            isPenalized: candidates[idx].isPenalized,
            matchedWith,
          }
        })
        .sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0))

      const pairs: DuplicatePair[] = bucket.pairs
        .map(pair => ({
          submissionIdA: candidates[pair.a].submissionId,
          submissionIdB: candidates[pair.b].submissionId,
          studentNameA: candidates[pair.a].studentName,
          studentNameB: candidates[pair.b].studentName,
          similarity: pair.similarity,
          identical: pair.identical,
        }))
        .sort((a, b) => b.similarity - a.similarity)

      const pendingSubmissions = members.filter(m => !m.isPenalized)
      const penalizedReferenceMembers = members.filter(m => m.isPenalized)
      const pendingCount = pendingSubmissions.length
      const isResolved = pendingCount === 0

      clusters.push({
        count: members.length,
        pendingCount,
        isResolved,
        maxSimilarity: pairs.length ? pairs[0].similarity : 0,
        allIdentical: pairs.every(p => p.identical),
        submissions: members,
        pendingSubmissions,
        penalizedReferenceMembers,
        pairs,
      })
    }

    // Sort active (unresolved) clusters first, then by max similarity
    return clusters.sort((a, b) => {
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1
      }
      return b.maxSimilarity - a.maxSimilarity || b.count - a.count
    })
  }

  /** Hash of the stored bytes plus structural fingerprints. Null when the file cannot be read. */
  private async analyse(fileUrl: string): Promise<{ exactHash: string; prints: Set<number> | null } | null> {
    try {
      let buffer: Buffer
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // Same convention as SubmissionsController.download: the query string
        // only carries the display filename, the file lives at the bare URL.
        const response = await fetch(fileUrl.split('?')[0])
        if (!response.ok) return null
        buffer = Buffer.from(await response.arrayBuffer())
      } else {
        const filePath = path.join(process.cwd(), fileUrl.split('?')[0])
        if (!fs.existsSync(filePath)) return null
        buffer = await fs.promises.readFile(filePath)
      }

      const exactHash = createHash('sha256').update(buffer).digest('hex')
      const corpus = await extractCorpus(buffer, fileUrl)
      const { prints } = fingerprint(normalizeSource(corpus))
      return { exactHash, prints }
    } catch {
      return null
    }
  }
}
