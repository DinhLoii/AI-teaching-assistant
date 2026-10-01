// @ts-nocheck
import { Request, Response } from 'express';

export class SubmissionController {
    public async uploadSubmission(req: Request, res: Response) {
        // Receives ZIP -> Uploads to MinIO -> Publishes job to RabbitMQ
        res.status(202).json({ 
            submissionId: 'sub-123', 
            status: 'Queued' 
        });
    }

    public async getSubmissionStatus(req: Request, res: Response) {
        res.json({
            submissionId: req.params.id,
            state: 'Evaluating'
        });
    }
}

