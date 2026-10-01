import type { Response } from 'express'
import { ApiResponse } from './api-response.js'

/**
 * Abstract base controller providing standardised response helpers.
 * All module controllers should extend this class.
 */
export abstract class BaseController {
  protected ok<T>(res: Response, data: T, message = 'Thành công'): void {
    res.status(200).json(ApiResponse.success(message, data))
  }

  protected created<T>(res: Response, data: T, message = 'Tạo thành công'): void {
    res.status(201).json(ApiResponse.success(message, data, 201))
  }

  protected noContent(res: Response): void {
    res.status(204).send()
  }

  protected paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Thành công',
  ): void {
    res.status(200).json(ApiResponse.pagination(message, items, total, page, limit))
  }
}
