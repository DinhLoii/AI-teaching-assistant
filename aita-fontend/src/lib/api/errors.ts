import { ApiError } from './client'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Không tìm thấy dữ liệu hoặc dữ liệu đã bị xóa.'
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (error.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  }
  return error instanceof Error ? error.message : 'Không thể kết nối. Vui lòng thử lại.'
}
