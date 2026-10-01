import type { Prisma, StudentClass } from '../../../../database/prisma.js'
import { IEnrollmentRepository, EnrollmentWithUser } from '../../domain/repositories/enrollment-repository.interface.js'

export class PrismaEnrollmentRepository implements IEnrollmentRepository {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async findMany(where?: Prisma.StudentClassWhereInput): Promise<EnrollmentWithUser[]> {
    return this.client.studentClass.findMany({
      where,
      include: { User: true },
    })
  }

  async create(data: Prisma.StudentClassUncheckedCreateInput): Promise<StudentClass> {
    return this.client.studentClass.create({ data })
  }

  async delete(classId: string, studentId: string): Promise<StudentClass> {
    return this.client.studentClass.delete({
      where: {
        UserId_ClassId: {
          UserId: studentId,
          ClassId: classId,
        },
      },
    })
  }
}
