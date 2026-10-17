import { request } from '../client'

const deadline = () => typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined

export const notificationsApi = {
  getUnreadCount: () => request<{ count: number }>('/notifications/unread-count', { cache: 'no-store', signal: deadline() }),
  getMyNotifications: (params?: { page?: number; limit?: number; read?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.page) q.append('page', String(params.page))
    if (params?.limit) q.append('limit', String(params.limit))
    if (params?.read !== undefined) q.append('read', String(params.read))
    const query = q.toString() ? `?${q.toString()}` : ''
    return request<any[]>(`/notifications${query}`, { cache: 'no-store', signal: deadline() })
  },

  getNotifications: (page = 1, limit = 20) => request<any>(`/notifications?page=${page}&limit=${limit}`, { cache: 'no-store', signal: deadline() }),

  markNotificationAsRead: (id: string) => request<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT', signal: deadline() }),

  markAllNotificationsAsRead: () => request<void>('/notifications/read-all', { method: 'PUT', signal: deadline() }),

  deleteNotification: (id: string) => request<void>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE', signal: deadline() }),

  deleteAllNotifications: () => request<void>('/notifications/all', { method: 'DELETE', signal: deadline() }),

  broadcastNotification: (body: any) => request<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),
}
