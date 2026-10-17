import type { Prisma } from '@prisma/client'

// Keep the query type-checked even while the legacy controller is migrated.
export const assignmentTrashQuery = {
    where: { OR: [{ IsDeleted: true }, { Status: 'Deleted' }, { DeletedAt: { not: null } }] },
    include: {
        Subject: { select: { SubjectCode: true, SubjectName: true } },
        ExamClass: { select: { ClassId: true } }
    },
    orderBy: { DeletedAt: 'desc' }
} satisfies Prisma.ExamFindManyArgs
