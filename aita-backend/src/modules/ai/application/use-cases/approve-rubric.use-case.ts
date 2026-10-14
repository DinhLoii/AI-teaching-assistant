import { prisma } from '../../../../database/prisma.js'
import { ForbiddenError, NotFoundError } from '../../../../shared/application/app.error.js'

export interface ApproveRubricInput {
  rubricId: string
  userId: string
  userRole: string
}

export class ApproveRubricUseCase {
  public async execute(input: ApproveRubricInput) {
    if (input.userRole !== 'LECTURER' && input.userRole !== 'ADMIN') {
      throw new ForbiddenError('Chỉ Giảng viên hoặc Quản trị viên mới có quyền phê duyệt rubric.')
    }

    const rubric = await prisma.rubric.findUnique({
      where: { Id: input.rubricId },
      include: { Criteria: true },
    })

    if (!rubric) {
      throw new NotFoundError('Không tìm thấy bản ghi Rubric yêu cầu.')
    }

    let approverId: string | null = null
    if (input.userId) {
      const u = await prisma.user.findUnique({ where: { Id: input.userId }, select: { Id: true } }).catch(() => null)
      if (u) approverId = u.Id
    }

    const updated = await prisma.rubric.update({
      where: { Id: input.rubricId },
      data: {
        Status: 'APPROVED',
        ApprovedBy: approverId,
        ApprovedAt: new Date(),
        UpdatedAt: new Date(),
      },
      include: { Criteria: true },
    })

    return {
      rubricId: updated.Id,
      title: updated.Title,
      status: updated.Status,
      approvedBy: updated.ApprovedBy,
      approvedAt: updated.ApprovedAt,
      criteriaCount: updated.Criteria.length,
    }
  }
}
