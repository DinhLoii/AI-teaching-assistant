import { request } from '../client'
import type { UserRow, BulkDeleteUsersResult, ImportUserRow, CreateUserBody, ImportUsersResult } from '../contracts'

export const usersApi = {
  getUsers: (role = 'all', page = 1, limit = 10, search?: string) =>
    request<UserRow[]>(`/users?role=${role}&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),

  getUser: (id: string) => request<any>(`/users/${id}`),

  createUser: (body: CreateUserBody | FormData) =>
    request<UserRow>('/users', { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),

  updateUser: (id: string, body: (Partial<CreateUserBody> & { status?: string, updatedClasses?: { classId: string, newClassCode: string, newSubjectCode?: string, semesterCode?: string, isNew?: boolean }[], deletedClasses?: string[], addedClasses?: string[] }) | FormData) =>
    request<UserRow>(`/users/${id}`, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),

  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  bulkDeleteUsers: (ids: string[]) =>
    request<BulkDeleteUsersResult>(`/users/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids }) }),

  toggleUserLock: (id: string, locked: boolean) =>
    request<UserRow>(`/users/${id}/lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }),

  importUsers: (body: { users: ImportUserRow[] } | FormData) =>
    request<ImportUsersResult>(`/users/import`, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),

  importStudentsExcel: (body: FormData) =>
    request<any>(`/users/import-students-excel`, { method: 'POST', body }),

  importLecturersExcel: (body: FormData) =>
    request<any>(`/users/import-lecturers-excel`, { method: 'POST', body }),

  importTeachingAssignmentsExcel: (body: FormData) =>
    request<any>(`/users/import-teaching-assignments-excel`, { method: 'POST', body }),
}
