export function canAccessExamDocument(exam: any, user: { id: string; role?: string } | undefined): boolean {
  if (!exam || !user?.id) return false
  const role = String(user.role).toLowerCase()
  if (role === 'admin') return true
  const classes = exam.classLecturers || []
  if (role === 'lecturer') return exam.createdBy === user.id || classes.some((row: any) => row.instructorIds?.includes(user.id))
  if (role === 'student') return String(exam.status).toLowerCase() === 'published' && classes.some((row: any) => row.studentIds?.includes(user.id))
  return false
}

/** Busboy may decode UTF-8 multipart filenames as Latin-1. Preserve genuine Unicode names. */
export function originalAttachmentName(name: string): string {
  if ([...name].some(character => character.codePointAt(0)! > 255)) return name
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}
