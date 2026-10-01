// @ts-nocheck
import { Request, Response, NextFunction } from 'express';

export class GlobalExceptionMiddleware {
    public static handle(err: any, req: Request, res: Response, next: NextFunction) {
        console.error(`[GlobalException] ${err.message}`, err.stack);
        
        res.status(err.status || 500).json({
            error: {
                message: err.message || 'Internal Server Error',
                correlationId: req.headers['x-correlation-id'] || 'unknown'
            }
        });
    }
}

