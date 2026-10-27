import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({ errorFormat: 'minimal' })
try {
  const result = await db.$transaction(async tx => {
    const subject = await tx.subject.upsert({
      where: { SubjectCode: 'FER202' }, update: {},
      create: {
        SubjectCode: 'FER202', SubjectName: 'Front-End Web Development with React', IsActive: true,
        Description: 'React frontend practice: components, props, state, forms, routing, localStorage, responsive UI and browser-based testing.',
      },
    })
    const frontend = await tx.projectType.upsert({
      where: { Code: 'frontend' }, update: {},
      create: { Code: 'frontend', DisplayName: 'Frontend Web', RequiresSandbox: true, SandboxImage: 'node:20-alpine' },
    })
    await tx.subjectProjectType.upsert({
      where: { SubjectId_ProjectTypeId: { SubjectId: subject.Id, ProjectTypeId: frontend.Id } },
      update: {}, create: { SubjectId: subject.Id, ProjectTypeId: frontend.Id },
    })
    return { code: subject.SubjectCode, active: subject.IsActive, projectType: frontend.Code }
  }, { timeout: 30000, maxWait: 15000 })
  console.log(JSON.stringify(result))
} catch (error) { console.error(JSON.stringify({ error: 'Unable to configure FER202', code: error.code || error.name })); process.exitCode = 1 }
finally { await db.$disconnect() }
