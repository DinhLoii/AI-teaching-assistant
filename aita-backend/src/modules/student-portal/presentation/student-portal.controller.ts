import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'
import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'
import { NotFoundError } from '../../../shared/application/app.error.js'

export class StudentPortalController extends BaseController {
  constructor(private readonly logger: ILogger) {
    super()
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student dashboard for ${studentId}`)

    const cacheKey = `student_dash_${studentId}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }

    // Run all 6 independent queries concurrently via Promise.all to minimize Neon DB round-trip latency
    const [
      studentSubmissions,
      rawAssignments,
      enrolledClasses,
      unreadNotifications,
      totalAssignments,
      recentGradedSubmission
    ] = await Promise.all([
      prisma.submission.findMany({
        where: { StudentId: studentId },
        select: {
          ExamId: true,
          TotalScore: true,
          FinalScore: true,
          GradingStatus: true,
          ReviewStatus: true,
          SubmittedAt: true,
        }
      }),
      (prisma.exam as any).findMany({
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
          }
        },
        select: {
          Id: true,
          Title: true,
          Description: true,
          DueDate: true,
          ExamType: true,
          ExamClass: {
            take: 1,
            select: {
              Class: {
                select: {
                  Id: true,
                  ClassCode: true,
                  Semester: {
                    select: {
                      Id: true,
                      Season: true,
                      Code: true,
                    }
                  },
                  Subject: {
                    select: {
                      SubjectCode: true,
                      SubjectName: true,
                    }
                  },
                  InstructorClass: {
                    take: 1,
                    select: {
                      User: {
                        select: {
                          FullName: true,
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { DueDate: 'asc' },
        take: 12
      }),
      prisma.class.findMany({
        where: {
          StudentClass: {
            some: { UserId: studentId }
          }
        },
        select: {
          Id: true,
          ClassCode: true,
          Subject: {
            select: {
              Id: true,
              SubjectCode: true,
              SubjectName: true,
              Credit: true,
              Description: true,
            }
          },
          Semester: {
            select: {
              Id: true,
              Season: true,
              Code: true,
              IsActive: true,
            }
          },
          InstructorClass: {
            select: {
              User: {
                select: {
                  Id: true,
                  FullName: true,
                  Avatar: true,
                  Email: true,
                }
              }
            }
          },
          _count: {
            select: {
              StudentClass: true,
              ExamClass: true,
            }
          }
        }
      }),
      prisma.notificationRecipient.count({
        where: {
          UserId: studentId,
          IsRead: false
        }
      }),
      (prisma.exam as any).count({
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
          }
        }
      }),
      prisma.submission.findFirst({
        where: {
          StudentId: studentId,
          OR: [
            { ReviewStatus: 'PUBLISHED' },
            { FinalScore: { not: null } },
            { TotalScore: { not: null } }
          ]
        },
        include: {
          Exam: true,
          Class: {
            include: {
              Subject: true,
            }
          },
          ExecutionResult: {
            take: 1,
            orderBy: { CompletedAt: 'desc' },
            include: {
              RuleScore: {
                include: {
                  RubricRule: true
                }
              }
            }
          }
        },
        orderBy: { SubmittedAt: 'desc' }
      })
    ]);

    const subMap = new Map(studentSubmissions.map(s => [s.ExamId, s]));

    const upcomingAssignments = (rawAssignments as any[]).map(a => {
      const firstClass = a.ExamClass?.[0]?.Class;
      const sem = firstClass?.Semester;
      const sub = subMap.get(a.Id);
      const isSubmitted = !!sub;
      const isGraded = sub?.ReviewStatus === 'PUBLISHED' || (sub?.FinalScore !== null && sub?.FinalScore !== undefined);

      let status = 'PENDING';
      if (isGraded) {
        status = 'GRADED';
      } else if (isSubmitted) {
        status = 'SUBMITTED';
      } else if (a.DueDate && new Date(a.DueDate) < new Date()) {
        status = 'OVERDUE';
      }

      return {
        id: a.Id,
        title: a.Title,
        description: a.Description,
        due: a.DueDate,
        type: a.ExamType || 'ASSIGNMENT',
        subjectCode: firstClass?.Subject?.SubjectCode || 'SUBJ',
        subjectName: firstClass?.Subject?.SubjectName || 'Môn học',
        classCode: firstClass?.ClassCode || 'SE1701',
        classId: firstClass?.Id,
        lecturerName: firstClass?.InstructorClass?.[0]?.User?.FullName || 'Nguyễn Văn Giảng',
        semesterSeason: sem?.Season || 'Spring 2026',
        semesterLabel: sem?.Season ? sem.Season.toUpperCase().replace(/\s+/g, '') : null,
        status,
        score: isGraded && (sub?.FinalScore != null || sub?.TotalScore != null)
          ? Number(sub?.FinalScore ?? sub?.TotalScore)
          : null,
        submittedAt: sub?.SubmittedAt || null,
      };
    });

    const submittedAssignments = studentSubmissions.length

    // Calculate real avg AI score from student's graded submissions in Neon DB
    const scoredSubmissions = studentSubmissions.filter(s => s.FinalScore != null || s.TotalScore != null)
    const avgAiScore = scoredSubmissions.length > 0
      ? Number((scoredSubmissions.reduce((acc, s) => acc + Number(s.FinalScore ?? s.TotalScore), 0) / scoredSubmissions.length).toFixed(1))
      : null

    let recentAiResult = null
    const aiFeedbackList: any[] = []

    if (recentGradedSubmission) {
      let report: any = null
      if (recentGradedSubmission.ReportData) {
        try {
          report = JSON.parse(recentGradedSubmission.ReportData)
        } catch (_) { }
      }

      recentAiResult = {
        id: recentGradedSubmission.Id,
        assignmentId: recentGradedSubmission.ExamId,
        title: recentGradedSubmission.Exam?.Title || 'Bài tập',
        subject: recentGradedSubmission.Class?.Subject?.SubjectName
          ? `${recentGradedSubmission.Class.Subject.SubjectCode} – ${recentGradedSubmission.Class.Subject.SubjectName}`
          : 'Môn học',
        score: Number(recentGradedSubmission.FinalScore ?? recentGradedSubmission.TotalScore ?? 0),
        maxScore: Number(recentGradedSubmission.Exam?.TotalPoints ?? 10),
        testcases: report?.testcasesSummary || (recentGradedSubmission.ExecutionResult?.[0] ? 'Đã hoàn thành kiểm thử Docker Sandbox' : 'Chưa có thông tin testcase'),
        execution: report?.executionSummary || 'Thực thi an toàn trong Sandbox',
        review: recentGradedSubmission.InstructorFeedback || report?.aiSummary || 'Đã hoàn thành đánh giá Rubric AI',
      }

      if (recentGradedSubmission.ExecutionResult?.[0]?.RuleScore) {
        for (const rs of recentGradedSubmission.ExecutionResult[0].RuleScore) {
          if (rs.AiReasoning || rs.InstructorComment) {
            aiFeedbackList.push({
              id: rs.Id,
              assignmentTitle: recentGradedSubmission.Exam?.Title || 'Bài tập',
              subjectCode: recentGradedSubmission.Class?.Subject?.SubjectCode || 'MÔN HỌC',
              badgeText: rs.EffectiveScore != null ? `Điểm: ${rs.EffectiveScore}/${rs.MaxScore ?? 10}` : 'Góp ý AI',
              detail: rs.InstructorComment || rs.AiReasoning,
              type: 'suggestion',
              link: '/student/results',
            })
          }
        }
      }
    }

    const result = {
      upcomingAssignments,
      totalAssignments,
      submittedAssignments,
      avgAiScore,
      recentAiResult,
      aiFeedbackList,
      enrolledClasses: enrolledClasses.map(c => ({
        id: c.Id,
        classCode: c.ClassCode,
        subject: {
          id: c.Subject?.Id,
          code: c.Subject?.SubjectCode,
          name: c.Subject?.SubjectName,
          credit: c.Subject?.Credit ?? 3,
          description: c.Subject?.Description,
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
          avatar: ic.User.Avatar,
          email: ic.User.Email,
        })),
        studentCount: (c as any)._count?.StudentClass ?? (c as any).StudentClass?.length ?? 0,
        assignmentCount: (c as any)._count?.ExamClass ?? (c as any).ExamClass?.length ?? 0,
      })),
      unreadNotifications
    }

    memoryCache.set(cacheKey, result, 20)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getSubjects(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    this.logger.debug(`Fetching student subjects for ${studentId}`)

    // Optional season filter: ?semester=SUMMER2026 (normalized season name without spaces)
    const seasonFilter = req.query.semester as string | undefined
    const cacheKey = `student_subjects_${studentId}_${seasonFilter || 'all'}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }

    // Find all classes the student is enrolled in, then map to unique subjects
    const enrolledClasses = await prisma.class.findMany({
      where: {
        StudentClass: {
          some: { UserId: studentId }
        }
      },
      select: {
        Id: true,
        ClassCode: true,
        Subject: {
          select: {
            Id: true,
            SubjectCode: true,
            SubjectName: true,
            Description: true,
          }
        },
        Semester: {
          select: {
            Id: true,
            Season: true,
            Code: true,
            IsActive: true,
          }
        },
        InstructorClass: {
          select: {
            User: {
              select: {
                Id: true,
                FullName: true,
                Avatar: true,
              }
            }
          }
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
          id: ic.User?.Id,
          name: ic.User?.FullName,
          avatar: ic.User?.Avatar || null,
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
          if (!existingLecturerIds.has(ic.User?.Id)) {
            existing.lecturers.push({
              id: ic.User?.Id,
              name: ic.User?.FullName,
              avatar: ic.User?.Avatar || null,
            })
          }
        }
      }
    }

    const result = Array.from(subjectsMap.values())
    memoryCache.set(cacheKey, result, 20)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getClassDetail(req: Request, res: Response): Promise<void> {
    const studentId = req.user!.id
    const classId = req.params.id as string
    this.logger.debug(`Fetching class detail ${classId} for student ${studentId}`)

    const cacheKey = `student_class_detail_${studentId}_${classId}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }

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
        Semester: true,
        InstructorClass: {
          include: {
            User: {
              select: {
                Id: true,
                FullName: true,
                Email: true,
                Avatar: true,
                LecturerCode: true,
                Phone: true,
              }
            }
          }
        },
        StudentClass: {
          include: {
            User: {
              select: {
                Id: true,
                StudentCode: true,
                FullName: true,
                Email: true,
                Avatar: true,
              }
            }
          },
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

      if (!subject && !exam) {
        throw new NotFoundError('Không tìm thấy lớp học')
      }

      // Find lecturers
      const lecturers = await prisma.user.findMany({
        where: {
          UserRole: { some: { Role: { RoleName: { in: ['LECTURER', 'Lecturer', 'lecturer', 'ADMIN', 'Admin'] } } } }
        },
        select: { Id: true, FullName: true, Email: true, Avatar: true, LecturerCode: true, Phone: true },
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

      let examSubmissions: any[] = []
      if (exam?.Id) {
        examSubmissions = await prisma.submission.findMany({
          where: { StudentId: studentId, ExamId: exam.Id },
          select: {
            Id: true,
            ExamId: true,
            TotalScore: true,
            FinalScore: true,
            GradingStatus: true,
            ReviewStatus: true,
            SubmittedAt: true,
          }
        })
      }
      const examSub = examSubmissions[0] || null

      const result = {
        id: classId,
        classCode: subject?.SubjectCode || exam?.Subject?.SubjectCode || 'LỚP HỌC',
        subject: (subject || exam?.Subject) ? {
          id: subject?.Id || exam?.Subject?.Id,
          code: subject?.SubjectCode || exam?.Subject?.SubjectCode,
          name: subject?.SubjectName || exam?.Subject?.SubjectName,
          description: subject?.Description || exam?.Subject?.Description,
          credit: subject?.Credit ?? exam?.Subject?.Credit ?? 3,
        } : null,
        semester: null,
        lecturers: lecturers.map(l => ({
          id: l.Id,
          name: l.FullName,
          email: l.Email,
          avatar: l.Avatar,
          lecturerCode: (l as any).LecturerCode || null,
          phone: (l as any).Phone || null
        })),
        students: [],
        announcements,
        assignments: exam ? [{
          id: exam.Id,
          title: exam.Title,
          description: exam.Description,
          status: exam.Status,
          dueDate: exam.DueDate,
          totalPoints: exam.TotalPoints,
          type: exam.ExamType,
          isSubmitted: !!examSub,
          submissionId: examSub?.Id || null,
          score: examSub?.FinalScore ?? examSub?.TotalScore ?? null,
          submittedAt: examSub?.SubmittedAt || null,
          gradingStatus: examSub?.GradingStatus || null,
          reviewStatus: examSub?.ReviewStatus || null,
        }] : []
      }

      memoryCache.set(cacheKey, result, 15)
      this.ok(res, result, MESSAGES.SUCCESS)
      return
    }

    const c = cls as any

    // 3. Extract enrolled students
    const studentList = (c.StudentClass || []).map((sc: any) => ({
      id: sc.User?.Id,
      studentCode: sc.User?.StudentCode || sc.User?.Id,
      fullName: sc.User?.FullName || 'Chưa cập nhật',
      email: sc.User?.Email,
      avatar: sc.User?.Avatar || null,
      joinedAt: sc.EnrolledAt ? sc.EnrolledAt.toISOString() : null
    }))

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

    // Query submissions for all exams in this class by current student
    const examIds = (c.ExamClass || []).map((ec: any) => ec.Exam?.Id).filter(Boolean)
    const submissions = examIds.length > 0 ? await prisma.submission.findMany({
      where: {
        StudentId: studentId,
        ExamId: { in: examIds }
      },
      select: {
        Id: true,
        ExamId: true,
        TotalScore: true,
        FinalScore: true,
        GradingStatus: true,
        ReviewStatus: true,
        SubmittedAt: true,
      }
    }) : []
    const subMap = new Map(submissions.map(s => [s.ExamId, s]))

    const result = {
      id: c.Id,
      classCode: c.ClassCode,
      subject: c.Subject ? {
        id: c.Subject.Id,
        code: c.Subject.SubjectCode,
        name: c.Subject.SubjectName,
        description: c.Subject.Description,
        credit: c.Subject.Credit,
      } : null,
      semester: c.Semester ? {
        id: c.Semester.Id,
        season: c.Semester.Season,
        code: c.Semester.Code,
        isActive: c.Semester.IsActive,
      } : null,
      lecturers: (c.InstructorClass || []).map((ic: any) => ({
        id: ic.User.Id,
        name: ic.User.FullName,
        email: ic.User.Email,
        avatar: ic.User.Avatar || null,
        lecturerCode: ic.User.LecturerCode || null,
        phone: ic.User.Phone || null,
      })),
      students: studentList,
      announcements: announcements,
      assignments: (c.ExamClass || []).map((ec: any) => {
        const exam = ec.Exam
        const sub = exam ? subMap.get(exam.Id) : null
        return {
          id: exam?.Id,
          title: exam?.Title,
          description: exam?.Description,
          status: exam?.Status,
          dueDate: ec.DueDate || exam?.DueDate,
          totalPoints: exam?.TotalPoints,
          type: exam?.ExamType,
          isSubmitted: !!sub,
          submissionId: sub?.Id || null,
          score: sub?.FinalScore ?? sub?.TotalScore ?? null,
          submittedAt: sub?.SubmittedAt || null,
          gradingStatus: sub?.GradingStatus || null,
          reviewStatus: sub?.ReviewStatus || null,
        }
      })
    }

    memoryCache.set(cacheKey, result, 20)
    this.ok(res, result, MESSAGES.SUCCESS)
  }
}

