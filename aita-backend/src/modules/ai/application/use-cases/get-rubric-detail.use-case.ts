import { prisma } from '../../../../database/prisma.js'
import { ForbiddenError, NotFoundError } from '../../../../shared/application/app.error.js'

export interface GetRubricDetailInput {
  rubricId: string
  userId: string
  userRole: string
}

export class GetRubricDetailUseCase {
  public async execute(input: GetRubricDetailInput) {
    const rubric = await prisma.rubric.findUnique({
      where: { Id: input.rubricId },
      include: {
        Criteria: {
          orderBy: { SortOrder: 'asc' },
        },
        UserCreator: {
          select: { Id: true, FullName: true, Email: true, LecturerCode: true },
        },
        UserApprover: {
          select: { Id: true, FullName: true, Email: true },
        },
      },
    })

    if (!rubric) {
      throw new NotFoundError('Không tìm thấy thông tin Rubric yêu cầu.')
    }

    // Role & ownership check:
    // If rubric is still DRAFT or PENDING_REVIEW, non-creator students/lecturers cannot view
    if (rubric.Status !== 'APPROVED' && input.userRole !== 'ADMIN') {
      if (input.userRole === 'STUDENT') {
        throw new ForbiddenError('Sinh viên không được phép xem rubric chưa được giảng viên phê duyệt.')
      }
      if (rubric.CreatedBy && rubric.CreatedBy !== input.userId) {
        throw new ForbiddenError('Bạn không có quyền truy cập bản nháp rubric của người dùng khác.')
      }
    }

    return rubric
  }
}
