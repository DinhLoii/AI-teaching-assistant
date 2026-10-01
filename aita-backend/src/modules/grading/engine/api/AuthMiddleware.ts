// @ts-nocheck
import { Request, Response, NextFunction } from 'express';

// UserContext type for grading engine
export interface UserContext {
    userId: string;
    role: 'Admin' | 'Instructor' | 'Student' | 'Reviewer';
}

export class AuthMiddleware {
    /**
     * Verifies JWT and extracts user roles.
     */
    public static verifyToken(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        // Mock JWT verification for architecture
        req.user = {
            userId: 'user-123',
            role: 'Instructor' // Mocked
        };
        next();
    }

    /**
     * Role-Based Access Control (RBAC) middleware.
     */
    public static requireRole(roles: ('Admin' | 'Instructor' | 'Student' | 'Reviewer')[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient role' });
            }
            next();
        };
    }
}

