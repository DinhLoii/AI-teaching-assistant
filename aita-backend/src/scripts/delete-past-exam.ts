import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.exam.deleteMany({ where: { Title: 'Past Deadline Assignment' } })
  console.log('Deleted exams:', result.count)
}
main().catch(console.error).finally(() => prisma.$disconnect())
