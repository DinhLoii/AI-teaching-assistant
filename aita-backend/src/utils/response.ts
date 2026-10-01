import type { Response } from 'express'
import { ApiResponse } from '../shared/presentation/api-response.js'

export const ok = <T>(res: Response, data: T, status = 200, message = 'Thành công'): void => {
  res.status(status).json(new ApiResponse(status, message, data))
}
