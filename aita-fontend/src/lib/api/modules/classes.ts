import { request } from '../client'
import type { ClassRow, CreateClassBody, StudentRow } from '../contracts'

export const classesApi = {
  getClasses: (page = 1, limit = 10, search?: string) => request<ClassRow[]>(`/classes?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),

  getClassDetail: (id: string) => request<ClassRow>(`/classes/${id}`),

  createClass: (body: CreateClassBody) =>
    request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),

  updateClass: (id: string, body: Partial<CreateClassBody>) =>
    request<ClassRow>(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteClass: (id: string) =>
    request<void>(`/classes/${id}`, { method: 'DELETE' }),

  getClassStudents: (classId: string) => request<StudentRow[]>(`/classes/${classId}/students`),

  enrollStudent: (classId: string, studentId: string) =>
    request<any>(`/classes/${classId}/enroll`, { method: 'POST', body: JSON.stringify({ studentId }) }),

  getClassCodes: (semesterCode?: string, subjectCode?: string) => {
    const params = new URLSearchParams();
    if (semesterCode) params.append('semesterCode', semesterCode);
    if (subjectCode) params.append('subjectCode', subjectCode);
    return request<{ classId: string, classCode: string, studentCount: number }[]>(`/classes/codes?${params.toString()}`);
  },

  getSubjectsBySemester: (semesterCode: string) => {
    const params = new URLSearchParams({ semesterCode });
    return request<{ Id: string, SubjectCode: string, SubjectName: string }[]>(`/classes/subjects?${params.toString()}`);
  },

  updateClassNote: (classId: string, note: string) =>
    request<ClassRow>(`/classes/${classId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  getClassAnnouncements: (classId: string) => request<any[]>(`/classes/${classId}/announcements`),

  postClassAnnouncement: (classId: string, content: string, title?: string) =>
    request<any>(`/classes/${classId}/announcements`, { method: 'POST', body: JSON.stringify({ content, title }) }),

  updateClassAnnouncement: (classId: string, announcementId: string, content: string, title?: string) =>
    request<any>(`/classes/${classId}/announcements/${announcementId}`, { method: 'PUT', body: JSON.stringify({ content, title }) }),

  deleteClassAnnouncement: (classId: string, announcementId: string) =>
    request<any>(`/classes/${classId}/announcements/${announcementId}`, { method: 'DELETE' }),
}
