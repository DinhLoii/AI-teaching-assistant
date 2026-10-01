import { PrismaClient } from '@prisma/client'
import { ImportUsersBatchDto } from '../dtos/user.dto.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export class ImportUsersUseCase {
    async execute(dto: ImportUsersBatchDto) {
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // In a real production system, this should be a transaction or chunked insert.
        // We'll iterate and create/update to handle complex mappings (Class, Subject, Semester).
        for (const item of dto.users) {
            try {
                // 1. Fetch or create roles
                const roleRecord = await prisma.role.findUnique({ where: { RoleName: item.role } })
                if (!roleRecord) throw new Error(`Role ${item.role} not found`)

                // 2. Hash default password (e.g., random or standard)
                const defaultPassword = 'Password123!'
                const passwordHash = await bcrypt.hash(defaultPassword, 10)

                // 3. Upsert user
                const user = await prisma.user.upsert({
                    where: { Email: item.email },
                    update: {
                        FullName: item.fullName,
                        Status: item.status,
                    },
                    create: {
                        Email: item.email,
                        FullName: item.fullName,
                        PasswordHash: passwordHash,
                        Status: item.status,
                    }
                })

                // 4. Ensure Role mapping
                await prisma.userRole.upsert({
                    where: {
                        UserId_RoleId: {
                            UserId: user.Id,
                            RoleId: roleRecord.Id
                        }
                    },
                    update: {},
                    create: {
                        UserId: user.Id,
                        RoleId: roleRecord.Id,
                        AssignedAt: new Date()
                    }
                })

                // 5. Handle Class mapping if provided
                if (item.classCode && item.semesterCode && item.subjectCode) {
                    // Find semester
                    const semesterCodeStr = item.semesterCode as string;
                    const allSemesters = await prisma.semester.findMany()
                    const semesterNumberMatch = semesterCodeStr.match(/\d+/)
                    const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null
                    
                    let semester = allSemesters.find(s => {
                        if (s.Code === semesterCodeStr) return true
                        if (s.Code?.toLowerCase() === semesterCodeStr.toLowerCase()) return true
                        const sNumMatch = s.Code?.match(/\d+/)
                        const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                        return sNum !== null && sNum === semesterNumber
                    })

                    if (!semester) {
                        semester = await prisma.semester.create({
                            data: {
                                Code: item.semesterCode,
                                IsActive: true
                            }
                        })
                    }

                    // Find subject
                    let subject = await prisma.subject.findUnique({ where: { SubjectCode: item.subjectCode } })
                    if (!subject) {
                        subject = await prisma.subject.create({
                            data: {
                                SubjectCode: item.subjectCode,
                                SubjectName: item.subjectCode,
                                IsActive: true
                            }
                        })
                    }

                    // Find class
                    let classRecord = await prisma.class.findFirst({ 
                        where: { 
                            ClassCode: item.classCode,
                            SubjectId: subject.Id,
                            SemesterId: semester.Id
                        } 
                    })
                    if (!classRecord) {
                        classRecord = await prisma.class.create({
                            data: {
                                ClassCode: item.classCode,
                                SemesterId: semester.Id,
                                SubjectId: subject.Id,
                                Status: 'Active'
                            }
                        })
                    }

                    // Enroll student or lecturer
                    if (item.role === 'STUDENT') {
                        await prisma.studentClass.upsert({
                            where: { UserId_ClassId: { UserId: user.Id, ClassId: classRecord.Id } },
                            update: {},
                            create: { UserId: user.Id, ClassId: classRecord.Id, EnrolledAt: new Date() }
                        })
                    } else if (item.role === 'LECTURER') {
                        await prisma.instructorClass.upsert({
                            where: { UserId_ClassId: { UserId: user.Id, ClassId: classRecord.Id } },
                            update: {},
                            create: { UserId: user.Id, ClassId: classRecord.Id, EnrolledAt: new Date() }
                        })
                    }
                }

                successCount++
            } catch (err: any) {
                errorCount++
                errors.push(`Row ${item.email}: ${err.message}`)
            }
        }

        return {
            totalProcessed: dto.users.length,
            successCount,
            errorCount,
            errors
        }
    }
}
