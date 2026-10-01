// @ts-nocheck
import { Request, Response } from 'express';

export class ReviewController {
    public async getPendingReviews(req: Request, res: Response) {
        res.json([
            { id: 'rev-1', reason: 'Low confidence evidence' }
        ]);
    }

    public async submitReviewDecision(req: Request, res: Response) {
        // Instructor approves or overrides the review case
        res.status(200).json({ status: 'Approved' });
    }
}

