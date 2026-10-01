export interface AuthUser {
  id: string
  email: string
  role: string
  fullName: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      requestId?: string
    }
  }
}

export {}
