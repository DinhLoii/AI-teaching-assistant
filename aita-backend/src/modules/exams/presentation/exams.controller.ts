import { publicUploadsRoot } from '../../../shared/infrastructure/runtime-storage.js'
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
import { canAccessExamDocument } from '../application/document-access.js'

import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

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
      view: req.query.view === 'summary' ? 'summary' : 'full',
    }
    const cacheKey = `exams_list_${req.user?.id}_${req.user?.role}_${JSON.stringify(params)}`
    const result = await memoryCache.wrap(cacheKey, 60, () => this.listExamsUseCase.execute({ user: req.user!, params }))
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.debug('Received request to create exam')
    memoryCache.invalidatePrefix('exams_list_')
    const dto = CreateExamRequestDto.from(req.body)
    const result = await this.createExamUseCase.execute({ dto, file: req.file, userId: req.user?.id })
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to update exam: ${id}`)
    memoryCache.invalidatePrefix('exams_list_')
    memoryCache.del(`exam_detail_${id}`)
    const dto = UpdateExamRequestDto.from(req.body)
    const result = await this.updateExamUseCase.execute({ id, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Received request to get exam details: ${id}`)
    const summary = req.query.view === 'summary'
    const cacheKey = `exam_detail_${id}_${req.user?.id || 'anon'}_${req.user?.role || ''}_${summary ? 'summary' : 'full'}`
    const result = await memoryCache.wrap(cacheKey, 30, () => this.getExamUseCase.execute(id, req.user?.id, req.user?.role, summary))
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    const attachmentId = req.params.attachmentId as string
    this.logger.debug(`Received request to download attachment: ${attachmentId}`)

    const attachment = await this.examRepo.getAttachment(attachmentId)
    if (!attachment?.fileUrl) {
      res.status(404).json({ success: false, Message: 'Attachment not found' })
      return
    }
    const exam = attachment.examId ? await this.examRepo.findById(attachment.examId) : null
    if (!canAccessExamDocument(exam, req.user)) {
      res.status(403).json({ success: false, message: 'Bạn không có quyền tải tài liệu của bài tập này.' }); return
    }
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const inline = req.query.inline === 'true' && path.extname(attachment.fileName).toLowerCase() === '.pdf'

    if (attachment.fileUrl.startsWith('http://') || attachment.fileUrl.startsWith('https://')) {
      try {
        const remote = new URL(attachment.fileUrl)
        if (remote.protocol !== 'https:' || remote.hostname !== 'res.cloudinary.com') { res.status(422).json({ success: false, message: 'Kho tài liệu này chưa được hỗ trợ tải trực tiếp.' }); return }
        const response = await fetch(attachment.fileUrl, { redirect: 'error', signal: AbortSignal.timeout(20000) });
        if (!response.ok) {
          this.logger.error(`Failed to fetch attachment from cloud: ${response.status} ${response.statusText}`);
          res.status(500).json({ success: false, Message: 'Failed to download file from cloud storage' });
          return;
        }

        if (inline) {
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

    const filePath = path.resolve(process.cwd(), attachment.fileUrl.replace(/^\/+/, ''))
    const uploadRoot = path.join(publicUploadsRoot(), 'attachments')
    if (!filePath.startsWith(uploadRoot + path.sep)) { res.status(422).json({ success: false, message: 'Vị trí tài liệu không hợp lệ.' }); return }
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found on disk: ${filePath}`)
      res.status(404).json({ success: false, Message: 'File not found on disk' })
      return
    }
    if (!fs.realpathSync(filePath).startsWith(fs.realpathSync(uploadRoot) + path.sep)) { res.status(422).json({ success: false, message: 'Vị trí tài liệu không hợp lệ.' }); return }

    if (inline) {
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
      res.sendFile(filePath);
    } else {
      res.download(filePath, attachment.fileName);
    }
  }
}
