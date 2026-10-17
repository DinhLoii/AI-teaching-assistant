// Both representations must change together; an absent legacy representation is allowed.
export async function changeAssignmentTrashState(db: any, cache: any, ids: string[], deleted: boolean) {
    await db.$transaction(async (tx: any) => {
        for (const id of [...new Set(ids)]) {
            const exam = await tx.exam.findUnique({ where: { Id: id } });
            const published = await tx.publishedAssignment.findUnique({ where: { Id: id } });
            if (!exam && !published) throw Object.assign(new Error('Không tìm thấy bài tập.'), { statusCode: 404 });
            const deletedAt = deleted ? new Date() : null;
            let document: any = null;
            if (published?.Data) document = JSON.parse(published.Data);
            const previousStatus = document?.trashPreviousStatus;
            if (document && deleted && exam && exam.Status !== 'Deleted') document.trashPreviousStatus = exam.Status;
            if (exam) await tx.exam.update({ where: { Id: id }, data: {
                IsDeleted: deleted, DeletedAt: deletedAt,
                Status: deleted ? 'Deleted' : previousStatus || 'Published'
            } });
            if (published) await tx.publishedAssignment.update({ where: { Id: id }, data: {
                IsDeleted: deleted, DeletedAt: deletedAt,
                ...(document ? { Data: JSON.stringify(document) } : {})
            } });
        }
    });
    // Invalidate after commit so the next list/detail read cannot reuse the old state.
    for (const prefix of ['exams_list_', 'exam_detail_', 'student_dash_', 'classes_', 'class_detail_']) cache.invalidatePrefix(prefix);
}
