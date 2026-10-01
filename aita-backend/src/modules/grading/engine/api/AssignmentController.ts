// @ts-nocheck
import { Request, Response } from 'express';
import { AssignmentManagementService } from '../assignment/AssignmentManagementService';

export class AssignmentController {
    constructor(private readonly assignmentService: AssignmentManagementService) {}

    public async uploadAssignment(req: Request, res: Response) {
        if (!req.file) return res.status(400).json({ error: 'Missing file' });

        try {
            const assignment = await this.assignmentService.createAssignmentFromDocumentAsync(
                req.file.buffer, 
                req.file.mimetype
            );
            res.status(201).json(assignment);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    public async getAssignment(req: Request, res: Response) {
        res.json({ id: req.params.id, status: 'published' });
    }
}

