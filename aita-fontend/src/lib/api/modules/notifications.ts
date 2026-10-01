import { request } from '../client'

export const notificationsApi = {
  getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  getMyNotifications: (params?: { page?: number; limit?: number; read?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.page) q.append('page', String(params.page))
    if (params?.limit) q.append('limit', String(params.limit))
    if (params?.read !== undefined) q.append('read', String(params.read))
    const query = q.toString() ? `?${q.toString()}` : ''
    return request<any[]>(`/notifications${query}`)
  },

  getNotifications: (page = 1, limit = 20) => request<any>(`/notifications?page=${page}&limit=${limit}`),

  markNotificationAsRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllNotificationsAsRead: () => request<void>('/notifications/read-all', { method: 'PUT' }),

  deleteNotification: (id: string) => request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  deleteAllNotifications: () => request<void>('/notifications/all', { method: 'DELETE' }),

  broadcastNotification: (body: any) => request<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),
}
