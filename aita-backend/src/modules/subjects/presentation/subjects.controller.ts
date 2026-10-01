import type { Request, Response } from 'express'
import { SubjectRequestDto } from '../application/dtos/subject.dto.js'
import { ListSubjectsUseCase } from '../application/use-cases/list-subjects.use-case.js'
import { CreateSubjectUseCase } from '../application/use-cases/create-subject.use-case.js'
import { UpdateSubjectUseCase } from '../application/use-cases/update-subject.use-case.js'
import { DeleteSubjectUseCase } from '../application/use-cases/delete-subject.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

import { GetSubjectStudentsUseCase } from '../application/use-cases/get-subject-students.use-case.js'
import { GetSubjectByIdUseCase } from '../application/use-cases/get-subject-by-id.use-case.js'

export class SubjectsController extends BaseController {
  constructor(
    private readonly listSubjectsUseCase: ListSubjectsUseCase,
    private readonly createSubjectUseCase: CreateSubjectUseCase,
    private readonly updateSubjectUseCase: UpdateSubjectUseCase,
    private readonly deleteSubjectUseCase: DeleteSubjectUseCase,
    private readonly getSubjectStudentsUseCase: GetSubjectStudentsUseCase,
    private readonly getSubjectByIdUseCase: GetSubjectByIdUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(_req: Request, res: Response): Promise<void> {
    this.logger.debug('Fetching list of subjects')
    const result = await this.listSubjectsUseCase.execute()
    this.ok(res, result, MESSAGES.SUBJECT_LIST_SUCCESS)
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.debug(`Fetching subject by id: ${id}`)
    const result = await this.getSubjectByIdUseCase.execute(id)
    this.ok(res, result, 'Lấy chi tiết môn học thành công')
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info('Creating new subject')
    const dto = SubjectRequestDto.from(req.body)
    const result = await this.createSubjectUseCase.execute(dto)
    this.created(res, result, MESSAGES.SUBJECT_CREATE_SUCCESS)
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.info(`Updating subject: ${id}`)
    const dto = SubjectRequestDto.from(req.body)
    const result = await this.updateSubjectUseCase.execute({ id, dto })
    this.ok(res, result, MESSAGES.SUBJECT_UPDATE_SUCCESS)
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    this.logger.info(`Removing subject: ${id}`)
    await this.deleteSubjectUseCase.execute(id)
    this.ok(res, null, MESSAGES.SUBJECT_DELETE_SUCCESS)
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const subjectId = req.params.id as string
    const semesterId = req.query.semesterId as string | undefined
    const classId = req.query.classId as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    this.logger.info(`Fetching students for subject: ${subjectId}`)
    const result = await this.getSubjectStudentsUseCase.execute({
      subjectId,
      semesterId,
      classId,
      page,
      limit
    })

    this.ok(res, result, MESSAGES.SUCCESS || 'Lấy danh sách sinh viên thành công')
  }
}
