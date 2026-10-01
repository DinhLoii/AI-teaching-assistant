import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

/**
 * DeleteSubjectUseCase
 * 
 * Handles deletion of a subject with full cascade:
 * - Removes subject from all semesters (SemesterSubject links)
 * - Deletes all classes that reference this subject
 * - Deletes all student enrollments in those classes
 * - Deletes all exams for this subject
 * - Deletes all submissions and grading data
 * - Deletes all rubric definitions
 * 
 * Uses repository transaction for atomicity - all or nothing.
 */
export class DeleteSubjectUseCase implements IUseCase<string, void> {
  constructor(private readonly subjectRepo: ISubjectRepository) { }

  async execute(id: string): Promise<void> {
    // Verify subject exists
    const existing = await this.subjectRepo.findById(id)
    if (!existing) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND)
    }

    // Repository handles cascade delete in transaction
    await this.subjectRepo.delete(id)
  }
}
