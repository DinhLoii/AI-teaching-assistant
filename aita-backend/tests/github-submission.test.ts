import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSubmissionLinks, downloadGithubSubmission } from '../src/modules/submissions/infrastructure/github-submission.js'
import { CreateSubmissionUseCase } from '../src/modules/submissions/application/use-cases/create-submission.use-case.js'
import { SubmissionMapper } from '../src/modules/submissions/infrastructure/mappers/submission.mapper.js'
import { SubmissionResponseDto } from '../src/modules/submissions/application/dtos/submission.dto.js'
import { readSubmissionFile } from '../src/modules/submissions/infrastructure/submission-storage.js'
import AdmZip from 'adm-zip'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const links = { githubUrl: 'https://github.com/student/fer202', vercelUrl: 'https://ai-teaching-assistant-roan.vercel.app/login' }
const commit = 'a'.repeat(40)

test('validates public provider URLs, including the supplied login demo', () => {
  assert.deepEqual(validateSubmissionLinks(links.githubUrl + '.git/', links.vercelUrl), links)
  for (const github of ['http://github.com/a/b', 'https://github.com.evil.test/a/b', 'https://github.com/a/b/tree/main', 'https://user@github.com/a/b', 'https://github.com/a/b?x=1']) assert.throws(() => validateSubmissionLinks(github, links.vercelUrl))
  for (const deploy of ['', 'http://demo.vercel.app', 'https://vercel.app.evil.test', 'https://demo.vercel.app.evil.test', 'https://user@demo.vercel.app']) assert.throws(() => validateSubmissionLinks(links.githubUrl, deploy))
})

test('FER202 snapshots a commit, persists metadata and retains manual grading policy', async () => {
  const originalFetch = globalThis.fetch
  const previousRoot = process.env.PRIVATE_SUBMISSION_DIR
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-github-'))
  process.env.PRIVATE_SUBMISSION_DIR = root
  const zip = new AdmZip(); zip.addFile('fer202/src/App.jsx', Buffer.from('export default function App(){return null}'))
  const bytes = zip.toBuffer()
  const calls: string[] = []
  globalThis.fetch = async (url: any, options: any) => {
    assert.equal(options.redirect, 'error')
    calls.push(String(url))
    return calls.length % 2 === 1 ? new Response(JSON.stringify({ sha: commit })) : new Response(bytes)
  }
  let saved: any
  let subject = 'FER202', enrolled = true, closed = false
  const db: any = {
    submission: { findFirst: async () => null },
    exam: { findUnique: async () => ({ Status: closed ? 'Closed' : 'Published', SubmissionOverride: [] }) },
    examClass: { findUnique: async () => null }, publishedAssignment: { findUnique: async () => null },
    user: { findUnique: async () => null }, notificationRecipient: { deleteMany: async () => ({}) },
  }
  const repos: any = {
    ExamRepository: { findById: async () => ({ id: 'exam' }) },
    ClassRepository: { findById: async () => ({ subjectId: 'subject', classCode: 'CLASS' }) },
    SubjectRepository: { findById: async () => ({ subjectCode: subject }) },
    EnrollmentRepository: { findMany: async () => enrolled ? [{}] : [] },
  }
  const service = new CreateSubmissionUseCase({ createAttempt: async (s: any) => { saved = s; s.attemptNumber = 2 } } as any, { resolve: (token: symbol) => repos[Symbol.keyFor(token)!] } as any, db)
  const input: any = { dto: { data: { examId: 'exam', classId: 'class', ...links } }, user: { id: 'student', role: 'STUDENT' } }
  try {
    const result = await service.execute(input)
    assert.equal(result.sourceCommit, commit)
    assert.equal(result.attemptNumber, 2)
    assert.deepEqual(await readSubmissionFile(result.zipFileUrl!), bytes)
    assert.deepEqual(calls, ['https://api.github.com/repos/student/fer202/commits/HEAD', `https://codeload.github.com/student/fer202/zip/${commit}`])
    const restored = SubmissionMapper.toDomain(SubmissionMapper.toPersistence(saved))
    assert.equal(SubmissionResponseDto.from(restored, 'STUDENT').vercelUrl, links.vercelUrl)
    assert.equal(restored.sourceCommit, commit)
    assert.equal(SubmissionResponseDto.from(restored, 'STUDENT').reportData, null)
    subject = 'PRJ301'; await assert.rejects(service.execute(input), /FER202/)
    subject = 'FER202'; enrolled = false; await assert.rejects(service.execute(input), /./)
    enrolled = true; closed = true; await assert.rejects(service.execute(input), /đã bị đóng/)
    closed = false; await assert.rejects(service.execute({ ...input, file: { originalname: 'x.zip' } }), /Chỉ chọn/)
    assert.equal(calls.length, 2, 'authorization and mode checks must precede external requests')
  } finally {
    globalThis.fetch = originalFetch
    if (previousRoot === undefined) delete process.env.PRIVATE_SUBMISSION_DIR; else process.env.PRIVATE_SUBMISSION_DIR = previousRoot
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('unavailable repositories and invalid commit responses are rejected without accepting a submission', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('', { status: 404 })
    await assert.rejects(downloadGithubSubmission(links.githubUrl), /Không tải được/)
    globalThis.fetch = async () => new Response(JSON.stringify({ sha: 'invalid' }))
    await assert.rejects(downloadGithubSubmission(links.githubUrl), /Không tải được/)
  } finally { globalThis.fetch = original }
})
