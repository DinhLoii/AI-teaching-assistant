import type { Prisma, StudentClass } from '../../../../database/prisma.js'

export type EnrollmentWithUser = Prisma.StudentClassGetPayload<{
  include: { User: true }
}>

export interface IEnrollmentRepository {
  findMany(where?: Prisma.StudentClassWhereInput): Promise<EnrollmentWithUser[]>
  create(data: Prisma.StudentClassUncheckedCreateInput): Promise<StudentClass>
  delete(classId: string, studentId: string): Promise<StudentClass>
}
