// @ts-nocheck
import { Request, Response } from 'express';

export class AuthController {
    public async login(req: Request, res: Response) {
        // Authenticate user, generate JWT and Refresh Token
        res.json({ token: 'mock.jwt.token', refreshToken: 'mock.refresh.token' });
    }

    public async refresh(req: Request, res: Response) {
        res.json({ token: 'mock.jwt.token.new' });
    }
}

