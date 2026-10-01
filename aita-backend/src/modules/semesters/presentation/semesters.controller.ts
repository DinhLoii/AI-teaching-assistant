import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { CreateSemesterUseCase } from '../application/use-cases/create-semester.use-case.js'
import { CreateSeasonUseCase } from '../application/use-cases/create-season.use-case.js'
import { UpdateSemesterUseCase } from '../application/use-cases/update-semester.use-case.js'
import { DeleteSemesterUseCase } from '../application/use-cases/delete-semester.use-case.js'
import { DeleteSeasonUseCase } from '../application/use-cases/delete-season.use-case.js'
import { ListSemestersUseCase } from '../application/use-cases/list-semesters.use-case.js'
import { ManageSemesterSubjectsUseCase } from '../application/use-cases/manage-semester-subjects.use-case.js'

import { CreateSemesterRequestDto, CreateSeasonRequestDto, UpdateSemesterRequestDto, ManageSemesterSubjectsRequestDto } from '../application/dtos/semester.dto.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { ValidationError } from '../../../shared/application/app.error.js'

export class SemestersController extends BaseController {
  constructor(
    private readonly semesterRepo: any,
    private readonly listSemestersUseCase: ListSemestersUseCase,
    private readonly createSemesterUseCase: CreateSemesterUseCase,
    private readonly createSeasonUseCase: CreateSeasonUseCase,
    private readonly updateSemesterUseCase: UpdateSemesterUseCase,
    private readonly deleteSemesterUseCase: DeleteSemesterUseCase,
    private readonly deleteSeasonUseCase: DeleteSeasonUseCase,
    private readonly manageSemesterSubjectsUseCase: ManageSemesterSubjectsUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching semesters by user ${req.user!.id}`)
    const result = await this.listSemestersUseCase.execute()
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new semester`)
    const dto = CreateSemesterRequestDto.from(req.body)
    const result = await this.createSemesterUseCase.execute(dto)
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async createSeason(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new season with 9 semesters`)
    const dto = CreateSeasonRequestDto.from(req.body)
    const result = await this.createSeasonUseCase.execute(dto)
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Updating semester ${id}`)
    const dto = UpdateSemesterRequestDto.from(req.body, id)
    const result = await this.updateSemesterUseCase.execute(dto)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Deleting semester ${id}`)
    await this.deleteSemesterUseCase.execute(id)
    this.noContent(res)
  }

  async deleteSeason(req: Request, res: Response): Promise<void> {
    const seasonParam = req.params.season
    if (typeof seasonParam !== 'string' || !seasonParam.trim()) {
      throw new ValidationError('Tên mùa học không hợp lệ')
    }
    const season = decodeURIComponent(seasonParam)

    this.logger.info(`Deleting entire season: ${season}`)
    await this.deleteSeasonUseCase.execute(season)
    this.noContent(res)
  }

  async activateSeason(req: Request, res: Response): Promise<void> {
    const seasonParam = req.params.season
    if (typeof seasonParam !== 'string' || !seasonParam.trim()) {
      throw new ValidationError('Tên mùa học không hợp lệ')
    }
    const season = decodeURIComponent(seasonParam)

    this.logger.info(`Setting active season: ${season}`)
    await this.semesterRepo.setActiveSeason(season)
    this.ok(res, { season, isActive: true }, 'Đã kích hoạt mùa học thành công')
  }

  async getSubjects(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    this.logger.info(`Fetching subjects for semester ${id}`)
    const subjects = await this.semesterRepo.getSubjects(id)
    this.ok(res, subjects, MESSAGES.SUCCESS)
  }

  async addSubjects(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { subjectIds } = req.body

    if (!Array.isArray(subjectIds)) {
      throw new ValidationError('subjectIds phải là một mảng')
    }

    this.logger.info(`Adding subjects to semester ${id}`)
    await this.semesterRepo.addSubjects(id, subjectIds)
    this.ok(res, null, MESSAGES.SUCCESS)
  }

  async removeSubject(req: Request, res: Response): Promise<void> {
    const { id, subjectId } = req.params
    this.logger.info(`Removing subject ${subjectId} from semester ${id}`)
    await this.semesterRepo.removeSubject(id, subjectId)
    this.noContent(res)
  }

  async getClassesBySubject(req: Request, res: Response): Promise<void> {
    const { id, subjectId } = req.params
    this.logger.info(`Fetching classes for semester ${id}, subject ${subjectId}`)
    const classes = await this.semesterRepo.getClassesBySubject(id, subjectId)
    this.ok(res, classes, MESSAGES.SUCCESS)
  }

  async manageSemesterSubjects(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Managing subjects for semester ${id}`)
    const dto = ManageSemesterSubjectsRequestDto.from(req.body)
    const result = await this.manageSemesterSubjectsUseCase.execute({
      semesterId: id,
      ...dto
    })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async listSemesterSubjects(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('ID kỳ học không hợp lệ')
    }

    this.logger.info(`Fetching subjects for semester ${id}`)
    // Return simple array by default (for frontend compatibility)
    // This is used by the admin classes page which expects SubjectRow[]
    const subjects = await this.semesterRepo.getSubjects(id)
    this.ok(res, subjects, MESSAGES.SUCCESS)
  }
}
