// @ts-nocheck
import { Request, Response } from 'express';

export class ReportController {
    public async getAssessmentReport(req: Request, res: Response) {
        res.json({
            submissionId: req.params.submissionId,
            totalScore: 95,
            isPass: true
        });
    }
}

