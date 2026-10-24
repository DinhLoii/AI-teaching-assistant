/** Personalized read model: individual extension, then enrolled class deadline, then exam deadline. */
export async function studentExamDeadlines(db: any, studentId: string, examIds: string[], classId?: string): Promise<Map<string, Date>> {
  if (!examIds.length) return new Map()
  const [classes, overrides] = await Promise.all([
    db.examClass.findMany({
      where: { ExamId: { in: examIds }, ...(classId ? { ClassId: classId } : {}), Class: { StudentClass: { some: { UserId: studentId } } } },
      select: { ExamId: true, DueDate: true },
      orderBy: { ClassId: 'asc' },
    }),
    db.submissionOverride.findMany({
      where: { StudentId: studentId, ExamId: { in: examIds }, ...(classId ? { OR: [{ ClassId: classId }, { ClassId: null }] } : {}) },
      select: { ExamId: true, ExtendedDueDate: true },
    }),
  ])
  const dates = new Map<string, Date>()
  for (const entry of classes) if (entry.DueDate && !dates.has(entry.ExamId)) dates.set(entry.ExamId, new Date(entry.DueDate))
  // Retain expired overrides too: display and submission validation must agree after expiry.
  for (const entry of overrides) if (entry.ExtendedDueDate) dates.set(entry.ExamId, new Date(entry.ExtendedDueDate))
  return dates
}
