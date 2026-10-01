import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const lecturer = await prisma.user.findFirst({ where: { Email: 'lecturer@fpt.edu.vn' }});
  const subject = await prisma.subject.findFirst();
  
  if (!lecturer || !subject) {
      console.log('Lecturer or Subject not found');
      return;
  }

  await prisma.exam.create({
    data: {
      Title: 'Past Deadline Assignment',
      Description: 'This is past due.',
      SubjectId: subject.Id,
      ExamType: 'Assignment',
      Status: 'Published',
      Duration: 60,
      // dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), 
      TotalPoints: 10,
      CreatedBy: lecturer.Id,
    }
  });
  console.log('Created past deadline assignment.');
}

main().catch(console.error).finally(() => prisma.$disconnect());


