import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PRF192_SYLLABUS } from '../prisma/data/syllabi/prf192-syllabus.ts'

// Add this course independently of the demo seed. Preserve existing course edits.
const db = new PrismaClient()
try {
  await db.$transaction(async tx => {
    const existing = await tx.subject.findUnique({ where: { SubjectCode: 'PRF192' } })
    const syllabus = existing?.SyllabusData ? JSON.parse(existing.SyllabusData) : {}
    const merged = { ...PRF192_SYLLABUS, ...syllabus }
    for (const key of ['learningOutcomes', 'studentTasks', 'tools', 'clos', 'assessmentScheme', 'sessions']) {
      if (!Array.isArray(merged[key]) || merged[key].length === 0) merged[key] = PRF192_SYLLABUS[key]
    }
    const subject = await tx.subject.upsert({
      where: { SubjectCode: 'PRF192' },
      create: {
        SubjectCode: 'PRF192',
        SubjectName: PRF192_SYLLABUS.name,
        Description: PRF192_SYLLABUS.description,
        Semester: 1,
        Credit: PRF192_SYLLABUS.noCredit,
        IsActive: true,
        SyllabusData: JSON.stringify(merged),
      },
      update: {
        Credit: existing?.Credit ?? PRF192_SYLLABUS.noCredit,
        SyllabusData: JSON.stringify(merged),
      },
    })
    const saved = await tx.subject.findUniqueOrThrow({ where: { Id: subject.Id } })
    const savedSyllabus = JSON.parse(saved.SyllabusData)
    if (saved.Credit == null || !savedSyllabus.learningOutcomes?.length) throw new Error('Verification failed')
    console.log(JSON.stringify({ action: existing ? 'completed-existing-course' : 'created', code: saved.SubjectCode, name: saved.SubjectName, credit: saved.Credit, active: saved.IsActive, clos: savedSyllabus.clos.length, sessions: savedSyllabus.sessions.length, learningOutcomeGroups: savedSyllabus.learningOutcomes.length }))
  }, { timeout: 30000 })
} catch (error) {
  console.error(JSON.stringify({ error: 'Unable to save PRF192; transaction rolled back.', code: error.code || 'ERROR' }))
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
