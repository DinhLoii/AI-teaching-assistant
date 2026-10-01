import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'

export class StudentPortalController extends BaseController {
  constructor(private readonly logger: ILogger) {
    super()
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student dashboard for ${studentId}`)

    // Fetch student's existing submissions to filter out completed assignments
    const studentSubmissions = await prisma.submission.findMany({
      where: { StudentId: studentId },
      select: { ExamId: true }
    });
    const submittedExamIds = studentSubmissions.map(s => s.ExamId).filter(Boolean) as string[];

    // Aggregate data: Assignments due soon, classes, notifications
    const rawUpcomingAssignments: any[] = await (prisma.exam as any).findMany({
      where: {
        Status: 'Published',
        NOT: [
          { IsDeleted: true },
          { Status: 'Deleted' }
        ],
        ExamClass: {
          some: {
            Class: {
              StudentClass: {
                some: { UserId: studentId }
              }
            }
          }
        },
        DueDate: {
          gte: new Date()
        },
        Id: {
          notIn: submittedExamIds
        }
      },
      include: {
        ExamClass: {
          include: {
            Class: {
              include: { Semester: true, Subject: true }
            }
          }
        }
      },
      orderBy: { DueDate: 'asc' },
      take: 10
    })

    const upcomingAssignments = rawUpcomingAssignments.map(a => {
      const firstClass = a.ExamClass?.[0]?.Class;
      const sem = firstClass?.Semester;
      return {
        id: a.Id,
        title: a.Title,
        due: a.DueDate,
        type: a.ExamType,
        subjectCode: firstClass?.Subject?.SubjectCode,
        semesterId: sem?.Id,
        semesterSeason: sem?.Season,
        semesterLabel: sem?.Season ? sem.Season.toUpperCase().replace(/\s+/g, '') : null
      };
    })

    const enrolledClasses = await prisma.class.findMany({
      where: {
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      include: {
        Subject: true,
        Semester: true,
        InstructorClass: {
          include: { User: true }
        }
      }
    })

    const unreadNotifications = await prisma.notificationRecipient.count({
      where: {
        UserId: studentId,
        IsRead: false
      }
    })

    const result = {
      upcomingAssignments,
      enrolledClasses: enrolledClasses.map(c => ({
        id: c.Id,
        classCode: c.ClassCode,
        subject: {
          id: c.Subject?.Id,
          code: c.Subject?.SubjectCode,
          name: c.Subject?.SubjectName
        },
        semester: c.Semester ? {
          id: c.Semester.Id,
          season: c.Semester.Season,
          code: c.Semester.Code,
          isActive: c.Semester.IsActive,
          // Normalize season for SemesterSelector: "Spring 2026" -> "SPRING2026"
          label: c.Semester.Season
            ? c.Semester.Season.toUpperCase().replace(/\s+/g, '')
            : null
        } : null,
        lecturers: c.InstructorClass.map(ic => ({
          id: ic.User.Id,
          name: ic.User.FullName,
          avatar: ic.User.Avatar
        }))
      })),
      unreadNotifications
    }

    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getSubjects(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student subjects for ${studentId}`)

    // Optional season filter: ?semester=SUMMER2026 (normalized season name without spaces)
    const seasonFilter = req.query.semester as string | undefined

    // Find all classes the student is enrolled in, then map to unique subjects
    const enrolledClasses = await prisma.class.findMany({
      where: {
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      include: {
        Subject: true,
        Semester: true,
        InstructorClass: {
          include: { User: true }
        }
      }
    })

    // Filter by season if provided (match normalized season: "Spring 2026" -> "SPRING2026")
    const filtered = seasonFilter
      ? enrolledClasses.filter(c => {
        if (!c.Semester || !c.Semester.Season) return false
        const normalizedSeason = c.Semester.Season.toUpperCase().replace(/\s+/g, '')
        return normalizedSeason === seasonFilter.toUpperCase()
      })
      : enrolledClasses

    // Each class row = one enrollment; subjects can appear in multiple semesters
    // Key by subjectId so same subject shows once per season
    const subjectsMap = new Map<string, any>()
    for (const c of filtered) {
      if (!c.Subject) continue

      const semesterLabel = c.Semester?.Season
        ? c.Semester.Season.toUpperCase().replace(/\s+/g, '')
        : null

      const mapKey = c.Subject.Id

      if (!subjectsMap.has(mapKey)) {
        const lecturers = c.InstructorClass.map(ic => ({
          id: ic.User.Id,
          name: ic.User.FullName,
          avatar: ic.User.Avatar || null,
        }))

        subjectsMap.set(mapKey, {
          id: c.Subject.Id,
          code: c.Subject.SubjectCode,
          name: c.Subject.SubjectName,
          description: c.Subject.Description,
          lecturers,
          semester: c.Semester ? {
            id: c.Semester.Id,
            season: c.Semester.Season,
            code: c.Semester.Code,
            isActive: c.Semester.IsActive,
            label: semesterLabel,
          } : null,
          classId: c.Id,
          classCode: c.ClassCode,
        })
      } else {
        // Merge lecturers if same subject appears in multiple classes of same season
        const existing = subjectsMap.get(mapKey)
        const existingLecturerIds = new Set(existing.lecturers.map((l: any) => l.id))
        for (const ic of c.InstructorClass) {
          if (!existingLecturerIds.has(ic.User.Id)) {
            existing.lecturers.push({
              id: ic.User.Id,
              name: ic.User.FullName,
              avatar: ic.User.Avatar || null,
            })
          }
        }
      }
    }

    this.ok(res, Array.from(subjectsMap.values()), MESSAGES.SUCCESS)
  }

  async getClassDetail(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    const classId = req.params.id as string
    this.logger.debug(`Fetching class detail ${classId} for student ${studentId}`)

    // 1. Find class by Id, SubjectId, ClassCode, or ExamId
    let cls = await prisma.class.findFirst({
      where: {
        OR: [
          { Id: classId },
          { SubjectId: classId },
          { ClassCode: classId },
          { ExamClass: { some: { ExamId: classId } } }
        ]
      },
      include: {
        Subject: true,
        InstructorClass: {
          include: { User: true }
        },
        StudentClass: {
          include: { User: true },
          orderBy: { EnrolledAt: 'asc' }
        },
        ExamClass: {
          include: {
            Exam: true
          }
        }
      }
    })

    // 2. If no direct class record matches, resolve via Subject or Exam and construct class view
    if (!cls) {
      const subject = await prisma.subject.findFirst({
        where: { OR: [{ Id: classId }, { SubjectCode: classId }] }
      })
      const exam = await prisma.exam.findFirst({
        where: { Id: classId },
        include: { Subject: true }
      })

      const activeStudents = await prisma.user.findMany({
        where: {
          OR: [
            { UserRole: { some: { Role: { RoleName: { in: ['STUDENT', 'Student', 'student'] } } } } },
            { StudentCode: { not: null } }
          ]
        },
        take: 50
      })

      const studentList = activeStudents.map(s => ({
        id: s.Id,
        studentCode: s.StudentCode || s.Id,
        fullName: s.FullName || 'Chưa cập nhật',
        email: s.Email,
        avatar: s.Avatar || null,
        joinedAt: s.LastLoginAt ? s.LastLoginAt.toISOString() : null
      }))

      // Find lecturers
      const lecturers = await prisma.user.findMany({
        where: {
          UserRole: { some: { Role: { RoleName: { in: ['LECTURER', 'Lecturer', 'lecturer', 'ADMIN', 'Admin'] } } } }
        },
        select: { Id: true, FullName: true, Email: true, Avatar: true },
        take: 3
      })

      const targetRefIds = [classId]
      if (subject?.Id && !targetRefIds.includes(subject.Id)) targetRefIds.push(subject.Id)
      if (subject?.SubjectCode && !targetRefIds.includes(subject.SubjectCode)) targetRefIds.push(subject.SubjectCode)

      const announcementRows = await prisma.notification.findMany({
        where: {
          ReferenceId: { in: targetRefIds },
          Type: { in: ['CLASS_ANNOUNCEMENT', 'CLASS', 'Announcement', 'ANNOUNCEMENT'] }
        },
        include: {
          User: {
            select: {
              Id: true,
              FullName: true,
              Email: true,
              Avatar: true
            }
          }
        },
        orderBy: { CreatedAt: 'desc' },
        take: 50
      })

      const announcements = announcementRows.map(r => ({
        id: r.Id,
        title: r.Title || 'Thông báo lớp học',
        content: r.Message,
        createdAt: r.CreatedAt,
        lecturer: {
          id: r.User?.Id || r.CreatedBy,
          name: r.User?.FullName || 'Giảng viên',
          email: r.User?.Email || '',
          avatar: r.User?.Avatar || null
        }
      }))

      const result = {
        id: classId,
        classCode: subject?.SubjectCode || exam?.Subject?.SubjectCode || 'LỚP HỌC',
        subject: (subject || exam?.Subject) ? {
          id: subject?.Id || exam?.Subject?.Id,
          code: subject?.SubjectCode || exam?.Subject?.SubjectCode,
          name: subject?.SubjectName || exam?.Subject?.SubjectName
        } : null,
        lecturers: lecturers.map(l => ({
          id: l.Id,
          name: l.FullName,
          email: l.Email,
          avatar: l.Avatar
        })),
        students: studentList,
        announcements,
        assignments: exam ? [{
          id: exam.Id,
          title: exam.Title,
          description: exam.Description,
          status: exam.Status,
          dueDate: exam.DueDate,
          totalPoints: exam.TotalPoints,
          type: exam.ExamType
        }] : []
      }

      this.ok(res, result, MESSAGES.SUCCESS)
      return
    }

    const c = cls as any

    // 3. Extract enrolled students or fallback to active students in system
    let studentList = (c.StudentClass || []).map((sc: any) => ({
      id: sc.User.Id,
      studentCode: sc.User.StudentCode || sc.User.Id,
      fullName: sc.User.FullName || 'Chưa cập nhật',
      email: sc.User.Email,
      avatar: sc.User.Avatar || null,
      joinedAt: sc.EnrolledAt ? sc.EnrolledAt.toISOString() : null
    }))

    if (studentList.length === 0) {
      const activeStudents = await prisma.user.findMany({
        where: {
          OR: [
            { UserRole: { some: { Role: { RoleName: { in: ['STUDENT', 'Student', 'student'] } } } } },
            { StudentCode: { not: null } }
          ]
        },
        take: 50
      })
      studentList = activeStudents.map(s => ({
        id: s.Id,
        studentCode: s.StudentCode || s.Id,
        fullName: s.FullName || 'Chưa cập nhật',
        email: s.Email,
        avatar: s.Avatar || null,
        joinedAt: s.LastLoginAt ? s.LastLoginAt.toISOString() : null
      }))
    }

    const announcementRows = await prisma.notification.findMany({
      where: {
        ReferenceId: c.Id,
        ReferenceType: 'CLASS'
      },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      },
      orderBy: { CreatedAt: 'desc' },
      take: 50
    })

    const announcements = announcementRows.map(r => ({
      id: r.Id,
      title: r.Title || 'Thông báo lớp học',
      content: r.Message,
      createdAt: r.CreatedAt,
      lecturer: {
        id: r.User?.Id || r.CreatedBy,
        name: r.User?.FullName || 'Giảng viên',
        email: r.User?.Email || '',
        avatar: r.User?.Avatar || null
      }
    }))

    const result = {
      id: c.Id,
      classCode: c.ClassCode,
      subject: c.Subject ? {
        id: c.Subject.Id,
        code: c.Subject.SubjectCode,
        name: c.Subject.SubjectName
      } : null,
      lecturers: (c.InstructorClass || []).map((ic: any) => ({
        id: ic.User.Id,
        name: ic.User.FullName,
        email: ic.User.Email,
        avatar: ic.User.Avatar || null
      })),
      students: studentList,
      announcements: announcements,
      assignments: (c.ExamClass || []).map((ec: any) => ({
        id: ec.Exam?.Id,
        title: ec.Exam?.Title,
        description: ec.Exam?.Description,
        status: ec.Exam?.Status,
        dueDate: ec.DueDate || ec.Exam?.DueDate,
        totalPoints: ec.Exam?.TotalPoints,
        type: ec.Exam?.ExamType
      }))
    }

    this.ok(res, result, MESSAGES.SUCCESS)
  }
}

