import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { prisma } from '../../../../database/prisma.js'

export class GetUserDetailsUseCase implements IUseCase<string, any> {
    constructor(
        private readonly logger: ILogger
    ) { }

    async execute(id: string): Promise<any> {
        this.logger.debug(`Fetching detailed user info for ID: ${id}`)
        
        // --- REALTIME AUTO-SYNC FOR PENDING ENROLLMENTS ---
        try {
            const pending = await (prisma as any).pendingEnrollment.findMany({ where: { UserId: id, Status: 'Pending' } });
            for (const pe of pending) {
                const potentialClasses = await (prisma as any).class.findMany({
                    where: {
                        ClassCode: pe.ClassCode
                    },
                    include: { Semester: true, Subject: true }
                });
                
                const peSemNumMatch = pe.SemesterCode?.match(/\d+/)
                const peSemNum = peSemNumMatch ? parseInt(peSemNumMatch[0], 10) : null

                for (const cls of potentialClasses) {
                    const clsSemNumMatch = cls.Semester?.Code?.match(/\d+/)
                    const clsSemNum = clsSemNumMatch ? parseInt(clsSemNumMatch[0], 10) : null
                    
                    const isSemesterMatch = cls.Semester?.Code === pe.SemesterCode || (peSemNum !== null && peSemNum === clsSemNum)
                    const isSubjectMatch = pe.SubjectCode ? (cls.Subject?.SubjectCode?.toLowerCase() === pe.SubjectCode.toLowerCase()) : true

                    if (isSemesterMatch && isSubjectMatch) {
                        const alreadyEnrolledInSubject = await (prisma as any).studentClass.findFirst({
                            where: {
                                UserId: id,
                                Class: {
                                    SubjectId: cls.SubjectId,
                                    SemesterId: cls.SemesterId
                                }
                            }
                        });
                        if (!alreadyEnrolledInSubject) {
                            await (prisma as any).studentClass.create({
                                data: { UserId: id, ClassId: cls.Id, EnrolledAt: new Date() }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            this.logger.error('Realtime auto-sync failed: ' + err)
        }
        // --- END AUTO-SYNC ---

        const user = await prisma.user.findUnique({
            where: { Id: id },
            include: {
                UserRole: {
                    include: { Role: true }
                },
                StudentClass: {
                    include: {
                        Class: {
                            include: {
                                Subject: true,
                                Semester: true,
                                InstructorClass: {
                                    include: {
                                        User: true
                                    }
                                }
                            }
                        }
                    }
                },
                InstructorClass: {
                    include: {
                        Class: {
                            include: {
                                Subject: true,
                                Semester: true
                            }
                        }
                    }
                },
                PendingEnrollment: {
                    where: { Status: 'Pending' }
                }
            }
        })

        if (!user) {
            throw new Error('User not found')
        }

        const roles = user.UserRole.map(ur => ur.Role?.RoleName || '')
        const primaryRole = roles[0] ?? 'STUDENT'

        return {
            id: user.Id,
            name: user.FullName,
            fullName: user.FullName,
            email: user.Email,
            role: primaryRole.toLowerCase(),
            status: user.Status?.toLowerCase() || 'active',
            studentCode: user.StudentCode,
            lecturerCode: user.LecturerCode,
            phone: user.Phone,
            avatar: user.Avatar,
            lastLoginAt: user.LastLoginAt ? user.LastLoginAt.toISOString() : null,
            requirePasswordChange: user.RequirePasswordChange ?? false,
            roles: roles,
            // Only populate these if they exist to avoid huge payloads
            enrolledClasses: [
                ...user.StudentClass.map(sc => ({
                    classId: sc.ClassId,
                    classCode: sc.Class?.ClassCode,
                    subjectCode: sc.Class?.Subject?.SubjectCode,
                    subjectName: sc.Class?.Subject?.SubjectName,
                    semesterCode: sc.Class?.Semester?.Code,
                    enrolledAt: sc.EnrolledAt ? sc.EnrolledAt.toISOString() : null,
                    instructorName: (sc.Class as any)?.InstructorClass?.map((ic: any) => ic.User?.FullName).filter(Boolean).join(', ') || null,
                    isPending: false
                })),
                ...user.PendingEnrollment.filter(pe => {
                    const peSemNumMatch = pe.SemesterCode?.match(/\d+/);
                    const peSemNum = peSemNumMatch ? parseInt(peSemNumMatch[0], 10) : null;

                    const hasEnrolled = user.StudentClass.some(sc => {
                        // ClassCode must match
                        if (sc.Class?.ClassCode !== pe.ClassCode) return false;
                        
                        // Semester must match
                        const scSemCode = sc.Class?.Semester?.Code;
                        const scSemNumMatch = scSemCode?.match(/\d+/);
                        const scSemNum = scSemNumMatch ? parseInt(scSemNumMatch[0], 10) : null;
                        const isSemMatch = scSemCode === pe.SemesterCode || (peSemNum !== null && scSemNum === peSemNum);
                        if (!isSemMatch) return false;
                        
                        // Subject must match (if it's a subject-specific pending)
                        if (pe.SubjectCode) {
                            return sc.Class?.Subject?.SubjectCode?.toLowerCase() === pe.SubjectCode.toLowerCase();
                        }
                        return true;
                    });
                    
                    return !hasEnrolled;
                }).map(pe => ({
                    classId: `pending-${pe.Id}`,
                    classCode: pe.ClassCode,
                    subjectCode: pe.SubjectCode || 'Đang chờ xếp môn',
                    subjectName: null,
                    semesterCode: pe.SemesterCode,
                    enrolledAt: pe.CreatedAt ? pe.CreatedAt.toISOString() : null,
                    instructorName: null,
                    isPending: true
                }))
            ],
            instructingClasses: user.InstructorClass.map(ic => ({
                classId: ic.ClassId,
                classCode: ic.Class?.ClassCode,
                subjectCode: ic.Class?.Subject?.SubjectCode,
                subjectName: ic.Class?.Subject?.SubjectName,
                semesterCode: ic.Class?.Semester?.Code,
                assignedAt: ic.EnrolledAt ? ic.EnrolledAt.toISOString() : null
            }))
        }
    }
}
