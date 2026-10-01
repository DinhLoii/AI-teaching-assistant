export function mapUser(u: any) {
  const primaryRole = u.UserRole?.[0]?.Role?.RoleName ?? 'STUDENT'
  return {
    id: u.Id,
    name: u.FullName,
    fullName: u.FullName,
    email: u.Email,
    role: primaryRole.toLowerCase(),
    status: u.Status?.toLowerCase() ?? 'active',
    studentCode: u.StudentCode,
    lecturerCode: u.LecturerCode,
    phone: u.Phone,
    avatar: u.Avatar,
    lastLoginAt: u.LastLoginAt?.toISOString() ?? null,
  }
}

export function mapClass(c: any) {
  const instructor = c.InstructorClass?.[0]?.User
  return {
    id: c.Id,
    code: c.ClassCode,
    name: c.ClassCode,
    subject: c.Subject?.SubjectName ?? c.SubjectId,
    semester: c.Semester?.Code ?? c.SemesterId,
    status: c.Status,
    lecturerId: instructor?.Id,
    lecturer: instructor ? mapUser(instructor) : undefined,
    studentCount: c.StudentClass?.length ?? c._count?.StudentClass ?? 0,
    count: c.StudentClass?.length ?? c._count?.StudentClass ?? 0,
  }
}

export function mapSubmission(s: any) {
  return {
    id: s.Id,
    examId: s.ExamId,
    studentId: s.StudentId,
    classId: s.ClassId,
    student: s.User_Submission_StudentIdToUser?.FullName ?? s.StudentId,
    assignment: s.Exam?.Title,
    status: s.GradingStatus?.toLowerCase() ?? 'pending',
    totalScore: s.TotalScore,
    finalScore: s.FinalScore,
    instructorFeedback: s.InstructorFeedback,
    submittedAt: s.SubmittedAt?.toISOString() ?? null,
    attemptNumber: s.AttemptNumber,
    isLatest: s.IsLatest,
  }
}

export function mapSubject(s: any) {
  return {
    id: s.Id,
    code: s.SubjectCode,
    name: s.SubjectName,
    description: s.Description,
    isActive: s.IsActive,
  }
}

export function mapNotification(n: any) {
  return {
    id: n.Id,
    title: n.Title,
    message: n.Message,
    type: n.Type,
    referenceId: n.ReferenceId,
    referenceType: n.ReferenceType,
    createdBy: n.CreatedBy,
    createdAt: n.CreatedAt?.toISOString() ?? null,
  }
}
