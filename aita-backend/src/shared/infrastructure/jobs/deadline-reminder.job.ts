import { prisma } from '../../../database/prisma.js'

import { logger } from '../logger.js'

// Simple job runner without external dependencies
export class DeadlineReminderJob {
  private timer: NodeJS.Timeout | null = null

  constructor() {
  }

  start() {
    // Run every 12 hours (43200000 ms)
    this.timer = setInterval(() => {
      this.run().catch(err => logger.error('Error running deadline reminder job:', err))
    }, 43200000)

    // Run immediately once on start
    setTimeout(() => this.run().catch(err => logger.error('Error running deadline reminder job:', err)), 5000)
    logger.info('Deadline reminder job started (Interval: 12h)')
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async run() {
    logger.info('Running deadline reminder job...')
    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    // Find exams due between 1-2 days
    const upcomingExams2Days = await prisma.exam.findMany({
      where: {
        Status: 'Published',
        DueDate: {
          gte: now,
          lte: twoDaysFromNow
        }
      },
      include: {
        ExamClass: {
          include: {
            Class: {
              include: {
                StudentClass: { include: { User: true } }
              }
            }
          }
        }
      }
    })

    for (const exam of upcomingExams2Days) {
      // Find all students for this exam
      const studentIds = new Set<string>()
      for (const ec of exam.ExamClass) {
        if (ec.Class?.StudentClass) {
          for (const sc of ec.Class.StudentClass) {
            studentIds.add(sc.UserId)
          }
        }
      }

      for (const studentId of studentIds) {
        // Skip students who have already submitted this exam
        const hasSubmitted = await prisma.submission.findFirst({
          where: {
            StudentId: studentId,
            ExamId: exam.Id
          }
        });
        if (hasSubmitted) continue;

        // Skip if reminder notification already sent for this student and exam
        const existingNotif = await prisma.notification.findFirst({
          where: {
            ReferenceId: exam.Id,
            Type: 'Reminder',
            NotificationRecipient: {
              some: { UserId: studentId }
            }
          }
        })
        if (existingNotif) continue

        await prisma.notification.create({
          data: {
            Title: `Nhắc nhở: Sắp đến hạn nộp bài`,
            Message: `Bài tập "${exam.Title}" sẽ hết hạn vào lúc ${exam.DueDate?.toLocaleString('vi-VN')}. Vui lòng hoàn thành đúng hạn.`,
            Type: 'Reminder',
            ReferenceId: exam.Id,
            ReferenceType: 'Exam',
            NotificationRecipient: {
              create: {
                UserId: studentId,
                IsRead: false
              }
            }
          }
        })
      }
    }

    logger.info(`Deadline reminder job completed. Sent reminders for ${upcomingExams2Days.length} exams.`)
  }
}

export const deadlineReminderJob = new DeadlineReminderJob()
