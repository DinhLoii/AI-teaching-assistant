import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up existing dummy exams and assignments...')
  
  await prisma.submission.deleteMany({})
  await prisma.examAttachment.deleteMany({})
  await prisma.examClass.deleteMany({})
  await prisma.examSection.deleteMany({})
  await prisma.exam.deleteMany({})
  
  console.log('✅ All existing exams and dummy assignments successfully deleted!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
