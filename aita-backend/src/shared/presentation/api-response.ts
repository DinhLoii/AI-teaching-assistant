/**
 * Standard API Response payload wrapper.
 * Conforms to ApiResponse{statusCode, Message, Data} schema.
 */
export class ApiResponse<T = unknown> {
  public readonly statusCode: number
  public readonly Message: string
  public readonly Data?: T
  public readonly timestamp: string

  constructor(statusCode: number, Message: string, Data?: T) {
    this.statusCode = statusCode
    this.Message = Message
    this.Data = Data
    this.timestamp = new Date().toISOString()
  }

  /**
   * Helper for checking if the response is successful.
   */
  get success(): boolean {
    return this.statusCode >= 200 && this.statusCode < 300
  }

  /**
   * Helper for creating a success response.
   */
  static success<T>(message: string, data?: T, statusCode = 200): ApiResponse<T> {
    return new ApiResponse<T>(statusCode, message, data)
  }

  /**
   * Helper for creating a paginated success response.
   */
  static pagination<T>(
    message: string,
    items: T[],
    total: number,
    page: number,
    limit: number,
    statusCode = 200
  ): ApiResponse<{ items: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    return new ApiResponse(statusCode, message, {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }

  /**
   * Helper for creating an error response.
   */
  static error<T = unknown>(message: string, statusCode = 500, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(statusCode, message, data)
  }

  static created<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(201, message, data)
  }

  static badRequest<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(400, message, data)
  }

  static unauthorized<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(401, message, data)
  }

  static forbidden<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(403, message, data)
  }

  static notFound<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(404, message, data)
  }

  static conflict<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(409, message, data)
  }
}
