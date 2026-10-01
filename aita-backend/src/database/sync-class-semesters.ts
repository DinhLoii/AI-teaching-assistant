import { prisma } from './prisma.js'

const SUBJECT_SEMESTER_MAPPING: Record<string, number> = {
  PRF192: 1,
  PRO192: 2,
  CSD201: 3,
  DBI202: 3,
  PRJ301: 4,
  PRN212: 5,
  SWP391: 5,
  WDP301: 6,
  PRM392: 8,
  PRM393: 8,
  SWD392: 8,
}

export async function syncClassSemesters(): Promise<void> {
  try {
    console.log('🔄 Syncing class semesters and subject alignments...')

    // 1. Ensure Subject.Semester numbers are aligned with curriculum
    for (const [code, expectedSem] of Object.entries(SUBJECT_SEMESTER_MAPPING)) {
      const subj = await prisma.subject.findUnique({ where: { SubjectCode: code } })
      if (subj && subj.Semester !== expectedSem) {
        await prisma.subject.update({
          where: { Id: subj.Id },
          data: { Semester: expectedSem }
        })
        console.log(`[Sync] Updated subject ${code} semester to ${expectedSem}`)
      }
    }

    // 2. Scan all existing classes and re-align Class.SemesterId if desynchronized from Subject.Semester
    const allClasses = await prisma.class.findMany({
      include: {
        Subject: true,
        Semester: true,
      }
    })

    for (const cls of allClasses) {
      if (!cls.Subject || !cls.Semester || !cls.Semester.Code) continue

      const targetSemNumber = cls.Subject.Semester
      if (targetSemNumber === null || targetSemNumber === undefined) continue

      const currentSemCode = cls.Semester.Code || '' // e.g. "Kỳ 5"
      const expectedSemCode = `Kỳ ${targetSemNumber}` // e.g. "Kỳ 3"
      const isNumberedSem = /^Kỳ\s*\d+/i.test(currentSemCode) || /^Semester\s*\d+/i.test(currentSemCode)

      if (isNumberedSem && currentSemCode !== expectedSemCode) {
        const season = cls.Semester.Season

        // Find or create matching Semester record in the same Season with expectedSemCode
        let targetSemester = await prisma.semester.findFirst({
          where: {
            Season: season,
            Code: expectedSemCode
          }
        })

        if (!targetSemester) {
          targetSemester = await prisma.semester.create({
            data: {
              Code: expectedSemCode,
              Season: season,
              IsActive: true,
              StartDate: cls.Semester.StartDate,
              EndDate: cls.Semester.EndDate
            }
          })
          console.log(`[Sync] Created missing semester '${expectedSemCode}' for season '${season}'`)
        }

        // Guard: check if a class with the same (ClassCode, SubjectId, targetSemesterId)
        // already exists — if so, the current record is a stale duplicate, skip to avoid
        // violating the unique constraint (ClassCode, SubjectId, SemesterId).
        const alreadyExists = await prisma.class.findFirst({
          where: {
            ClassCode: cls.ClassCode,
            SubjectId: cls.SubjectId,
            SemesterId: targetSemester.Id,
          }
        })

        if (alreadyExists) {
          // Target record already correct — nothing to do for this class
          continue
        }

        // Relink class to the correct Semester
        await prisma.class.update({
          where: { Id: cls.Id },
          data: { SemesterId: targetSemester.Id }
        })

        // Ensure SemesterSubject link exists
        const semSubjExists = await (prisma as any).semesterSubject.findFirst({
          where: { SemesterId: targetSemester.Id, SubjectId: cls.SubjectId }
        })

        if (!semSubjExists) {
          await (prisma as any).semesterSubject.create({
            data: { SemesterId: targetSemester.Id, SubjectId: cls.SubjectId }
          })
        }

        console.log(`[Sync] Relinked class ${cls.ClassCode || cls.Id} (${cls.Subject.SubjectCode}) from '${currentSemCode}' to '${expectedSemCode}' (${season})`)
      }
    }

    // 3. Cleanup spurious phantom class SE18C02 under WDP301 if it has 0 students and 0 exams
    const phantomWdpClass = await prisma.class.findFirst({
      where: {
        ClassCode: 'SE18C02',
        Subject: { SubjectCode: 'WDP301' }
      },
      include: {
        _count: { select: { StudentClass: true, ExamClass: true } }
      }
    })

    if (phantomWdpClass && phantomWdpClass._count.StudentClass === 0 && phantomWdpClass._count.ExamClass === 0) {
      await prisma.instructorClass.deleteMany({ where: { ClassId: phantomWdpClass.Id } })
      await prisma.class.delete({ where: { Id: phantomWdpClass.Id } })
      console.log('[Sync] Removed spurious phantom class SE18C02 under WDP301')
    }

    console.log('✅ Class semester synchronization complete.')
  } catch (err) {
    console.error('⚠️ Class semester synchronization failed:', err)
  }
}
