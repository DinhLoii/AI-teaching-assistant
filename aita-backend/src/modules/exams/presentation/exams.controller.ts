import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { CreateExamRequestDto, UpdateExamRequestDto } from '../application/dtos/exam.dto.js'
import { ListExamsUseCase } from '../application/use-cases/list-exams.use-case.js'
import { CreateExamUseCase } from '../application/use-cases/create-exam.use-case.js'
import { UpdateExamUseCase } from '../application/use-cases/update-exam.use-case.js'
import { GetExamUseCase } from '../application/use-cases/get-exam.use-case.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import type { IExamRepository } from '../domain/repositories/exam-repository.interface.js'
import path from 'path'
import fs from 'fs'

export class ExamsController extends BaseController {
  constructor(
    private readonly listExamsUseCase: ListExamsUseCase,
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly updateExamUseCase: UpdateExamUseCase,
    private readonly getExamUseCase: GetExamUseCase,
    private readonly logger: ILogger,
    private readonly examRepo: IExamRepository
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.debug('Received request to list exams')
    const params = {
      classId: req.query.classId as string | undefined,
      status: req.query.status as any,
      type: req.query.type as any,
      tab: req.query.tab as string | undefined,
    }
    const result = await this.listExamsUseCase.execute({ user: req.user!, params })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.debug('Received request to create exam')
    const dto = CreateExamRequestDto.from(req.body)
    const result = await this.createExamUseCase.execute({ dto, file: req.file, userId: req.user?.id })
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to update exam: ${id}`)
    const dto = UpdateExamRequestDto.from(req.body)
    const result = await this.updateExamUseCase.execute({ id, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to get exam details: ${id}`)
    // Pass the caller so a student sees the lecturer of the class they belong to.
    const result = await this.getExamUseCase.execute(id, req.user?.id)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    const attachmentId = req.params.attachmentId as string
    this.logger.debug(`Received request to download attachment: ${attachmentId}`)

    const attachment = await this.examRepo.getAttachment(attachmentId)
    if (!attachment) {
      res.status(404).json({ success: false, Message: 'Attachment not found' })
      return
    }

    if (attachment.fileUrl.startsWith('http://') || attachment.fileUrl.startsWith('https://')) {
      try {
        const response = await fetch(attachment.fileUrl);
        if (!response.ok) {
          this.logger.error(`Failed to fetch attachment from cloud: ${response.status} ${response.statusText}`);
          res.status(500).json({ success: false, Message: 'Failed to download file from cloud storage' });
          return;
        }

        if (req.query.inline === 'true') {
          res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
        } else {
          res.attachment(attachment.fileName);
        }
        
        if ((attachment as any).fileType) {
          res.setHeader('Content-Type', (attachment as any).fileType);
        } else {
          res.setHeader('Content-Type', 'application/octet-stream');
        }

        if (response.body) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.end(buffer);
        } else {
          res.status(500).json({ success: false, Message: 'Empty file from cloud storage' });
        }
      } catch (err: any) {
        this.logger.error(`Error streaming attachment: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, Message: 'Error streaming file' });
        }
      }
      return;
    }

    const filePath = path.join(process.cwd(), attachment.fileUrl)
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found on disk: ${filePath}`)
      res.status(404).json({ success: false, Message: 'File not found on disk' })
      return
    }

    if (req.query.inline === 'true') {
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
      res.sendFile(filePath);
    } else {
      res.download(filePath, attachment.fileName);
    }
  }
}
