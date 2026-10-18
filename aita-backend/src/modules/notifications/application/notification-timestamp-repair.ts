interface LegacyNotification {
  Id: string; Type: string | null; ReferenceId: string | null; ReferenceType: string | null;
  CreatedBy: string | null; CreatedAt: Date | null;
}
interface SubmissionEvent {
  ExamId: string | null; StudentId: string | null; AttemptNumber: number | null; SubmittedAt: Date | null;
}

/** Only recover a date when the notification identifies exactly one persisted submission event. */
export function planNotificationTimestampRepairs(rows: LegacyNotification[], submissions: SubmissionEvent[]) {
  const events = new Map<string, SubmissionEvent[]>()
  const key = (exam: string | null, student: string | null, type: string) => JSON.stringify([exam, student, type])
  for (const event of submissions) {
    if (!event.ExamId || !event.StudentId || !event.SubmittedAt || !Number.isFinite(new Date(event.SubmittedAt).getTime())) continue
    const type = event.AttemptNumber === 1 ? 'NEW_SUBMISSION' : (event.AttemptNumber || 0) > 1 ? 'RESUBMISSION' : null
    if (!type) continue
    const eventKey = key(event.ExamId, event.StudentId, type)
    events.set(eventKey, [...(events.get(eventKey) || []), event])
  }
  const repairs: { id: string; createdAt: Date; source: 'submission_event' }[] = []
  for (const row of rows) {
    const type = String(row.Type).toUpperCase(), referenceType = String(row.ReferenceType).toUpperCase()
    if (row.CreatedAt || !row.CreatedBy || !row.ReferenceId || !['NEW_SUBMISSION', 'RESUBMISSION'].includes(type) ||
      !['EXAM', 'ASSIGNMENT', 'ASSIGNMENT_GRADING'].includes(referenceType)) continue
    const matches = events.get(key(row.ReferenceId, row.CreatedBy, type)) || []
    if (matches.length === 1) repairs.push({ id: row.Id, createdAt: new Date(matches[0].SubmittedAt!), source: 'submission_event' })
  }
  return { repairs, unresolved: rows.filter(row => !row.CreatedAt && !repairs.some(repair => repair.id === row.Id)).length }
}

export async function collectNotificationTimestampRepairs(db: any) {
  const rows = await db.notification.findMany({
    where: { CreatedAt: null },
    select: { Id: true, Type: true, ReferenceId: true, ReferenceType: true, CreatedBy: true, CreatedAt: true },
  }) as LegacyNotification[]
  const pairs = [...new Map(rows.filter(row => row.CreatedBy && row.ReferenceId && ['NEW_SUBMISSION', 'RESUBMISSION'].includes(String(row.Type).toUpperCase()))
    .map(row => [JSON.stringify([row.ReferenceId, row.CreatedBy]), { ExamId: row.ReferenceId, StudentId: row.CreatedBy }])).values()]
  const submissions: SubmissionEvent[] = []
  for (let offset = 0; offset < pairs.length; offset += 200) {
    submissions.push(...await db.submission.findMany({
      where: { OR: pairs.slice(offset, offset + 200) },
      select: { ExamId: true, StudentId: true, AttemptNumber: true, SubmittedAt: true },
    }))
  }
  return { missing: rows.length, ...planNotificationTimestampRepairs(rows, submissions) }
}
