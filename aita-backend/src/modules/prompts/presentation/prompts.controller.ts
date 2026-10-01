import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ListPromptsBySubjectUseCase } from '../application/use-cases/list-prompts-by-subject.use-case.js'
import { CreatePromptUseCase } from '../application/use-cases/create-prompt.use-case.js'
import { UpdatePromptUseCase } from '../application/use-cases/update-prompt.use-case.js'
import { DeletePromptUseCase } from '../application/use-cases/delete-prompt.use-case.js'
import { IncrementPromptUsageUseCase } from '../application/use-cases/increment-prompt-usage.use-case.js'

export class PromptsController extends BaseController {
  constructor(
    private readonly listPromptsBySubjectUseCase: ListPromptsBySubjectUseCase,
    private readonly createPromptUseCase: CreatePromptUseCase,
    private readonly updatePromptUseCase: UpdatePromptUseCase,
    private readonly deletePromptUseCase: DeletePromptUseCase,
    private readonly incrementPromptUsageUseCase: IncrementPromptUsageUseCase
  ) {
    super()
  }

  async listBySubject(req: Request, res: Response): Promise<void> {
    const subjectId = req.params.subjectId as string
    const result = await this.listPromptsBySubjectUseCase.execute(subjectId)
    this.ok(res, result, 'Lấy danh sách Prompt mẫu thành công')
  }

  async create(req: Request, res: Response): Promise<void> {
    const result = await this.createPromptUseCase.execute({
      ...req.body,
      createdBy: req.user?.id,
    })
    this.created(res, result, 'Tạo mới Prompt mẫu thành công')
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    const result = await this.updatePromptUseCase.execute(id, req.body)
    this.ok(res, result, 'Cập nhật Prompt mẫu thành công')
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    await this.deletePromptUseCase.execute(id)
    this.ok(res, null, 'Xóa Prompt mẫu thành công')
  }

  async incrementUsage(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    await this.incrementPromptUsageUseCase.execute(id)
    this.ok(res, null, 'Tăng số lượt sử dụng thành công')
  }
}
