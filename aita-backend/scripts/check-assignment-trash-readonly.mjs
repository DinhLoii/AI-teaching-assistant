import dotenv from 'dotenv'
dotenv.config({ quiet: true })
const { prisma } = await import('../src/database/prisma.ts')
const { assignmentTrashQuery } = await import('../src/modules/grading/engine/assignment/assignment-trash-query.ts')
try {
    const exams = await prisma.exam.findMany(assignmentTrashQuery)
    const published = await prisma.publishedAssignment.count({ where: { IsDeleted: true } })
    process.stdout.write(JSON.stringify({ deletedExams: exams.length, deletedPublishedAssignments: published, queryValid: true }) + '\n')
} finally { await prisma.$disconnect() }
