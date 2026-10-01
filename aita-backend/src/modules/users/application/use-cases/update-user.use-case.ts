import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UpdateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import type { UserRoleType } from '../../../auth/domain/entities/user.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface UpdateUserInput {
    id: string
    dto: UpdateUserDto
}

export class UpdateUserUseCase implements IUseCase<UpdateUserInput, UserResponseDto> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly hashService: IHashService,
        private readonly logger: ILogger
    ) { }

    async execute({ id, dto }: UpdateUserInput): Promise<UserResponseDto> {
        this.logger.info(`Updating user: ${id}`)
        
        const user = await this.userRepo.findById(id)
        if (!user) throw new NotFoundError(MESSAGES.USER_NOT_FOUND)

        if (dto.email && dto.email.toLowerCase() !== user.email) {
            const existingEmail = await this.userRepo.findByEmail(dto.email.toLowerCase())
            if (existingEmail) {
                throw new ConflictError(MESSAGES.USER_EMAIL_EXISTS)
            }
        }

        // Apply domain updates
        user.updateProfile({
            fullName: dto.fullName,
            avatar: dto.avatar !== undefined ? (dto.avatar || undefined) : undefined,
            studentCode: dto.studentCode !== undefined ? (dto.studentCode || undefined) : undefined,
            lecturerCode: dto.lecturerCode !== undefined ? (dto.lecturerCode || undefined) : undefined,
            phone: dto.phone !== undefined ? (dto.phone || undefined) : undefined,
        })
        
        if (dto.email) user.email = dto.email.toLowerCase()

        if (dto.status === 'Locked') user.suspend()
        else if (dto.status === 'Inactive') user.deactivate()
        else if (dto.status === 'Active') user.activate()

        if (dto.password) {
            const passwordHash = await this.hashService.hash(dto.password)
            user.changePassword(passwordHash)
        }

        await this.userRepo.save(user)

        if (dto.role) {
            const targetRole = await this.userRepo.findRoleByName(dto.role.toUpperCase())
            if (targetRole) {
                await this.userRepo.assignRole(id, targetRole.id)
                user.assignRole(dto.role.toUpperCase() as UserRoleType)
            }
        }

        if (dto.updatedClasses && dto.updatedClasses.length > 0) {
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new (PrismaClient as any)();
            for (const item of dto.updatedClasses) {
                try {
                    if (item.classId && item.classId.startsWith('pending-')) {
                        const peId = item.classId.replace('pending-', '');
                        const pe = await prisma.pendingEnrollment.findUnique({ where: { Id: peId } });
                        if (pe) {
                            await prisma.pendingEnrollment.update({
                                where: { Id: peId },
                                data: { ClassCode: item.newClassCode }
                            });
                            
                            // Try to resolve the pending enrollment to an actual class immediately
                            const subject = pe.SubjectCode ? await prisma.subject.findFirst({ where: { SubjectCode: pe.SubjectCode } }) : null;
                            const peSemNumMatch = pe.SemesterCode?.match(/\d+/);
                            const peSemNum = peSemNumMatch ? parseInt(peSemNumMatch[0], 10) : null;
                            const semesters = await prisma.semester.findMany();
                            const semester = semesters.find((s: any) => s.Code === pe.SemesterCode || (peSemNum !== null && s.Code?.match(/\d+/) && parseInt(s.Code.match(/\d+/)[0], 10) === peSemNum));

                            if (subject && semester) {
                                let newClass = await prisma.class.findUnique({
                                    where: {
                                        ClassCode_SubjectId_SemesterId: {
                                            ClassCode: item.newClassCode,
                                            SubjectId: subject.Id,
                                            SemesterId: semester.Id
                                        }
                                    }
                                });
                                if (!newClass) {
                                    newClass = await prisma.class.create({
                                        data: {
                                            ClassCode: item.newClassCode,
                                            SubjectId: subject.Id,
                                            SemesterId: semester.Id,
                                            Status: 'active'
                                        }
                                    });
                                }
                                
                                const exists = await prisma.studentClass.findUnique({
                                    where: { UserId_ClassId: { UserId: pe.UserId, ClassId: newClass.Id } }
                                });
                                if (!exists) {
                                    await prisma.studentClass.create({
                                        data: { UserId: pe.UserId, ClassId: newClass.Id, EnrolledAt: new Date() }
                                    });
                                }
                                await prisma.pendingEnrollment.delete({ where: { Id: peId } });
                            }
                        }
                    } else if (item.isNew && item.semesterCode && item.newSubjectCode && item.newClassCode) {
                        const semester = await prisma.semester.findFirst({ where: { Code: item.semesterCode } });
                        const subject = await prisma.subject.findFirst({ where: { SubjectCode: item.newSubjectCode } });
                        
                        if (semester && subject) {
                            let newClass = await prisma.class.findUnique({
                                where: {
                                    ClassCode_SubjectId_SemesterId: {
                                        ClassCode: item.newClassCode,
                                        SubjectId: subject.Id,
                                        SemesterId: semester.Id
                                    }
                                }
                            });
                            
                            if (!newClass) {
                                newClass = await prisma.class.create({
                                    data: {
                                        ClassCode: item.newClassCode,
                                        SubjectId: subject.Id,
                                        SemesterId: semester.Id,
                                        Status: 'active'
                                    }
                                });
                            }
                            
                            const role = user.roles[0] || 'STUDENT';
                            if (role === 'STUDENT') {
                                const exists = await prisma.studentClass.findUnique({
                                    where: { UserId_ClassId: { UserId: id, ClassId: newClass.Id } }
                                });
                                if (!exists) {
                                    await prisma.studentClass.create({
                                        data: { UserId: id, ClassId: newClass.Id, EnrolledAt: new Date() }
                                    });
                                    
                                    // Create blank submissions for all exams in the new class
                                    const examClasses = await prisma.examClass.findMany({
                                        where: { ClassId: newClass.Id }
                                    });
                                    for (const ec of examClasses) {
                                        const existingSubmission = await prisma.submission.findFirst({
                                            where: { StudentId: id, ExamId: ec.ExamId, ClassId: newClass.Id }
                                        });
                                        if (!existingSubmission) {
                                            await prisma.submission.create({
                                                data: {
                                                    StudentId: id,
                                                    ExamId: ec.ExamId,
                                                    ClassId: newClass.Id,
                                                    GradingStatus: 'Missing',
                                                    ReviewStatus: 'Pending',
                                                    TotalScore: 0,
                                                    FinalScore: 0,
                                                    AttemptNumber: 1,
                                                    IsLatest: true
                                                }
                                            });
                                        }
                                    }
                                }
                            } else if (role === 'LECTURER') {
                                const exists = await prisma.instructorClass.findUnique({
                                    where: { UserId_ClassId: { UserId: id, ClassId: newClass.Id } }
                                });
                                if (!exists) {
                                    await (prisma as any).instructorClass.create({
                                        data: { UserId: id, ClassId: newClass.Id, AssignedAt: new Date() }
                                    });
                                }
                            }
                        }
                    } else if (item.classId) {
                        const oldClass = await prisma.class.findUnique({ where: { Id: item.classId } });
                        if (oldClass && oldClass.SubjectId && oldClass.SemesterId) {
                            let targetSubjectId = oldClass.SubjectId;
                            if (item.newSubjectCode) {
                                const newSubj = await prisma.subject.findFirst({ where: { SubjectCode: item.newSubjectCode } });
                                if (newSubj) {
                                    targetSubjectId = newSubj.Id;
                                }
                            }
                            
                            let newClass = await prisma.class.findUnique({
                                where: {
                                    ClassCode_SubjectId_SemesterId: {
                                        ClassCode: item.newClassCode,
                                        SubjectId: targetSubjectId,
                                        SemesterId: oldClass.SemesterId
                                    }
                                }
                            });
                            if (!newClass) {
                                newClass = await prisma.class.create({
                                    data: {
                                        ClassCode: item.newClassCode,
                                        SubjectId: targetSubjectId,
                                        SemesterId: oldClass.SemesterId,
                                        Status: 'active'
                                    }
                                });
                            }
                            
                            const role = user.roles[0] || 'STUDENT';
                            
                            if (role === 'STUDENT') {
                                const exists = await prisma.studentClass.findUnique({
                                    where: { UserId_ClassId: { UserId: id, ClassId: newClass.Id } }
                                });
                                if (exists) {
                                    await prisma.studentClass.delete({
                                        where: { UserId_ClassId: { UserId: id, ClassId: oldClass.Id } }
                                    });
                                } else {
                                    await prisma.studentClass.update({
                                        where: { UserId_ClassId: { UserId: id, ClassId: oldClass.Id } },
                                        data: { ClassId: newClass.Id }
                                    });
                                }
                                // Migrate submissions
                                await prisma.submission.updateMany({
                                    where: { StudentId: id, ClassId: oldClass.Id },
                                    data: { ClassId: newClass.Id }
                                });
                            } else if (role === 'LECTURER') {
                                const exists = await prisma.instructorClass.findUnique({
                                    where: { UserId_ClassId: { UserId: id, ClassId: newClass.Id } }
                                });
                                if (exists) {
                                    await prisma.instructorClass.delete({
                                        where: { UserId_ClassId: { UserId: id, ClassId: oldClass.Id } }
                                    });
                                } else {
                                    await prisma.instructorClass.update({
                                        where: { UserId_ClassId: { UserId: id, ClassId: oldClass.Id } },
                                        data: { ClassId: newClass.Id }
                                    });
                                }
                            }
                            
                            // Prevent background sync from re-enrolling the user to the old class
                            const subject = await prisma.subject.findUnique({ where: { Id: oldClass.SubjectId } });
                            const semester = await prisma.semester.findUnique({ where: { Id: oldClass.SemesterId } });
                            if (subject && semester) {
                                await prisma.pendingEnrollment.updateMany({
                                    where: {
                                        UserId: id,
                                        ClassCode: oldClass.ClassCode,
                                        SubjectCode: subject.SubjectCode,
                                        SemesterCode: semester.Code
                                    },
                                    data: {
                                        Status: 'Completed'
                                    }
                                });
                            }
                        }
                    }
                } catch (err) {
                    this.logger.error(`Failed to update class assignment ${item.classId} for user ${id}`, err as Error);
                }
            }
            
            // Handle deletedClasses
            if (dto.deletedClasses && dto.deletedClasses.length > 0) {
                const role = user.roles[0] || 'STUDENT';
                for (const classId of dto.deletedClasses) {
                    try {
                        if (role === 'STUDENT') {
                            await prisma.studentClass.deleteMany({
                                where: { UserId: id, ClassId: classId }
                            });
                        } else if (role === 'LECTURER') {
                            await prisma.instructorClass.deleteMany({
                                where: { UserId: id, ClassId: classId }
                            });
                        }
                    } catch (err) {
                        this.logger.error(`Failed to delete class assignment ${classId} for user ${id}`, err as Error);
                    }
                }
            }

            // Handle addedClasses
            if (dto.addedClasses && dto.addedClasses.length > 0) {
                const role = user.roles[0] || 'STUDENT';
                for (const classId of dto.addedClasses) {
                    try {
                        if (role === 'STUDENT') {
                            const exists = await prisma.studentClass.findUnique({
                                where: { UserId_ClassId: { UserId: id, ClassId: classId } }
                            });
                            if (!exists) {
                                await prisma.studentClass.create({
                                    data: { UserId: id, ClassId: classId, EnrolledAt: new Date() }
                                });
                            }
                        } else if (role === 'LECTURER') {
                            const exists = await prisma.instructorClass.findUnique({
                                where: { UserId_ClassId: { UserId: id, ClassId: classId } }
                            });
                            if (!exists) {
                                await prisma.instructorClass.create({
                                    data: { UserId: id, ClassId: classId, EnrolledAt: new Date() }
                                });
                            }
                        }
                    } catch (err) {
                        this.logger.error(`Failed to add class assignment ${classId} for user ${id}`, err as Error);
                    }
                }
            }
            
            await prisma.$disconnect();
        }
        
        return UserResponseDto.from(user)
    }
}
