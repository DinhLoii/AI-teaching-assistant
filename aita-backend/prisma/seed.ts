import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PRF192_SYLLABUS } from './data/syllabi/prf192-syllabus.js'
import { PRO192_SYLLABUS } from './data/syllabi/pro192-syllabus.js'
import { DBI202_SYLLABUS } from './data/syllabi/dbi202-syllabus.js'
import { PRN212_SYLLABUS } from './data/syllabi/prn212-syllabus.js'
import { SWD392_SYLLABUS } from './data/syllabi/swd392-syllabus.js'
import { WDP301_SYLLABUS } from './data/syllabi/wdp301-syllabus.js'
import { PRJ301_SYLLABUS } from './data/syllabi/prj301-syllabus.js'
import { PRM392_SYLLABUS } from './data/syllabi/prm392-syllabus.js'
import { SWP391_SYLLABUS } from './data/syllabi/swp391-syllabus.js'
import { CSD201_SYLLABUS } from './data/syllabi/csd201-syllabus.js'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AITA database...')

  try {
    await prisma.$connect()
  } catch (error: any) {
    console.error('\n❌ [LỖI KẾT NỐI CƠ SỞ DỮ LIỆU] Không thể kết nối tới SQL Server tại localhost:1433.')
    console.error('─────────────────────────────────────────────────────────────────────────────')
    console.error('👉 Vui lòng kiểm tra các bước sau:')
    console.error('   1. Dịch vụ SQL Server: Mở Services (services.msc) -> Kiểm tra SQL Server (SQLEXPRESS) hoặc MSSQLSERVER đã ở trạng thái Running chưa.')
    console.error('   2. Bật TCP/IP: Mở SQL Server Configuration Manager -> Protocols for SQLEXPRESS -> Enable TCP/IP -> Thiết lập IPAll TCP Port = 1433.')
    console.error('   3. Kiểm tra biến DATABASE_URL trong file aita-backend/.env.')
    console.error('─────────────────────────────────────────────────────────────────────────────\n')
    process.exit(1)
  }

  const hash = (p: string) => bcrypt.hash(p, 10)

  // The deploy runs this on every push to main, and everything below the role
  // assignments rewrites content people edit through the app: the subject
  // upserts overwrite SubjectName/Description/SyllabusData, and the audit log
  // gains a row per run. SEED_SCOPE=accounts stops after roles and users, which
  // is all a deployed server needs for people to be able to log in.
  const accountsOnly = process.env.SEED_SCOPE === 'accounts'

  // Create roles first
  const adminRole = await prisma.role.upsert({
    where: { RoleName: 'ADMIN' },
    update: {},
    create: { RoleName: 'ADMIN' },
  })

  const lecturerRole = await prisma.role.upsert({
    where: { RoleName: 'LECTURER' },
    update: {},
    create: { RoleName: 'LECTURER' },
  })

  const studentRole = await prisma.role.upsert({
    where: { RoleName: 'STUDENT' },
    update: {},
    create: { RoleName: 'STUDENT' },
  })

  // Create users
  const admin = await prisma.user.upsert({
    where: { Email: 'admin@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'admin@fpt.edu.vn',
      PasswordHash: await hash('admin123'),
      FullName: 'Quản trị AITA',
      StudentCode: 'ADM001',
      Status: 'Active',
    },
  })

  const lecturer = await prisma.user.upsert({
    where: { Email: 'lecturer@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'lecturer@fpt.edu.vn',
      PasswordHash: await hash('lecturer123'),
      FullName: 'Nguyễn Văn Giảng',
      StudentCode: 'GV001',
      Status: 'Active',
    },
  })

  const student = await prisma.user.upsert({
    where: { Email: 'student@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'student@fpt.edu.vn',
      PasswordHash: await hash('student123'),
      FullName: 'Trần Thị Sinh',
      StudentCode: 'HE170000',
      Status: 'Active',
    },
  })

  // Create 3 specific student accounts requested for PRM, CSD, PRN classes
  const seedStudentsData = [
    { email: 'student1@fpt.edu.vn', name: 'Lê Văn An', code: 'HE170001' },
    { email: 'student2@fpt.edu.vn', name: 'Phạm Thị Bình', code: 'HE170002' },
    { email: 'student3@fpt.edu.vn', name: 'Hoàng Văn Cường', code: 'HE170003' },
  ]

  const seededStudents = [student]
  for (const st of seedStudentsData) {
    const sUser = await prisma.user.upsert({
      where: { Email: st.email },
      update: {
        FullName: st.name,
        StudentCode: st.code,
      },
      create: {
        Email: st.email,
        PasswordHash: await hash('student123'),
        FullName: st.name,
        StudentCode: st.code,
        Status: 'Active',
      },
    })
    seededStudents.push(sUser)
  }

  // Assign roles
  await prisma.userRole.upsert({
    where: { UserId_RoleId: { UserId: admin.Id, RoleId: adminRole.Id } },
    update: {},
    create: { UserId: admin.Id, RoleId: adminRole.Id },
  })

  await prisma.userRole.upsert({
    where: { UserId_RoleId: { UserId: lecturer.Id, RoleId: lecturerRole.Id } },
    update: {},
    create: { UserId: lecturer.Id, RoleId: lecturerRole.Id },
  })

  for (const stUser of seededStudents) {
    await prisma.userRole.upsert({
      where: { UserId_RoleId: { UserId: stUser.Id, RoleId: studentRole.Id } },
      update: {},
      create: { UserId: stUser.Id, RoleId: studentRole.Id },
    })
  }

  if (accountsOnly) {
    console.log('✅ Seed (chỉ tài khoản) xong — không đụng tới môn học, lớp, học kỳ.')
    console.log('   Quản trị: admin@fpt.edu.vn / admin123')
    console.log('   Giảng viên: lecturer@fpt.edu.vn / lecturer123')
    console.log('   Sinh viên: student@fpt.edu.vn, student1-3@fpt.edu.vn / student123')
    return
  }

  // Create subjects
  const defaultSubjects: Array<{ code: string; name: string; desc: string; semester: number; syllabus?: any }> = [
    { code: 'PRF192', name: 'Programming Fundamentals', desc: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.', semester: 1, syllabus: PRF192_SYLLABUS },
    { code: 'PRO192', name: 'Object-Oriented Programming', desc: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.', semester: 2, syllabus: PRO192_SYLLABUS },
    { code: 'CSD201', name: 'Data Structures and Algorithms', desc: 'Core data structures & algorithms: linked lists, stacks, queues, trees, BSTs, heaps, hash tables, graphs, and Big-O complexity analysis.', semester: 3, syllabus: CSD201_SYLLABUS },
    { code: 'DBI202', name: 'Introduction to Database Systems', desc: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).', semester: 3, syllabus: DBI202_SYLLABUS },
    { code: 'PRJ301', name: 'Java Web Application Development', desc: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.', semester: 4, syllabus: PRJ301_SYLLABUS },
    { code: 'PRN212', name: 'C# Programming and .NET', desc: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.', semester: 5, syllabus: PRN212_SYLLABUS },
    { code: 'SWP391', name: 'Software Development Project', desc: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.', semester: 5, syllabus: SWP391_SYLLABUS },
    { code: 'WDP301', name: 'Web Application Development', desc: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.', semester: 6, syllabus: WDP301_SYLLABUS },
    { code: 'PRM392', name: 'Mobile Programming', desc: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.', semester: 8, syllabus: PRM392_SYLLABUS },
    { code: 'SWD392', name: 'Software Architecture and Design', desc: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.', semester: 8, syllabus: SWD392_SYLLABUS },
  ]

  for (const subj of defaultSubjects) {
    const syllabusJson = subj.syllabus ? JSON.stringify(subj.syllabus) : null
    await (prisma.subject as any).upsert({
      where: { SubjectCode: subj.code },
      update: {
        SubjectName: subj.name,
        Description: subj.desc,
        Semester: subj.semester,
        ...(syllabusJson ? { SyllabusData: syllabusJson } : {})
      },
      create: {
        SubjectCode: subj.code,
        SubjectName: subj.name,
        Description: subj.desc,
        IsActive: true,
        Semester: subj.semester,
        SyllabusData: syllabusJson
      }
    })
  }

  // Fetch subjects for class creation
  const prjSubject = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'PRJ301' } })
  const prmSubject = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'PRM392' } })
  const csdSubject = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'CSD201' } })
  const prnSubject = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'PRN212' } })

  // Create semester
  const semester = await prisma.semester.upsert({
    where: { Season_Code: { Season: 'Spring', Code: '2026' } },
    update: {},
    create: {
      Season: 'Spring',
      Code: '2026',
      StartDate: new Date('2026-01-15'),
      EndDate: new Date('2026-05-30'),
      IsActive: true,
    },
  })

  // Create classes for target subjects (PRM, CSD, PRN) and assign Lecturer Nguyễn Văn Giảng + Students
  const targetClassesConfig = [
    { code: 'PRJ301-SE1701', subjectId: prjSubject.Id },
    { code: 'PRM392-SE1701', subjectId: prmSubject.Id },
    { code: 'CSD201-SE1701', subjectId: csdSubject.Id },
    { code: 'PRN212-SE1701', subjectId: prnSubject.Id },
  ]

  for (const cfg of targetClassesConfig) {
    const cls = await prisma.class.upsert({
      where: {
        ClassCode_SubjectId_SemesterId: {
          ClassCode: cfg.code,
          SubjectId: cfg.subjectId,
          SemesterId: semester.Id,
        },
      },
      update: {},
      create: {
        ClassCode: cfg.code,
        SubjectId: cfg.subjectId,
        SemesterId: semester.Id,
        Status: 'Active',
      },
    })

    // Assign Lecturer Nguyễn Văn Giảng as instructor for the class
    await prisma.instructorClass.upsert({
      where: { UserId_ClassId: { UserId: lecturer.Id, ClassId: cls.Id } },
      update: {},
      create: { UserId: lecturer.Id, ClassId: cls.Id },
    })

    // Enroll all 3 students (and default student) into the class
    for (const stUser of seededStudents) {
      await prisma.studentClass.upsert({
        where: { UserId_ClassId: { UserId: stUser.Id, ClassId: cls.Id } },
        update: {},
        create: { UserId: stUser.Id, ClassId: cls.Id },
      })
    }
  }

  // Exams will be created by lecturer through + Tạo Lab / Bài tập

  // Create audit log
  await prisma.auditLog.create({
    data: {
      UserId: admin.Id,
      Action: 'Created',
      EntityName: 'Database',
      NewValue: JSON.stringify({ users: 6, classes: 4 }),
    },
  })

  console.log('✅ Seed xong!')
  console.log('   Quản trị: admin@fpt.edu.vn / admin123')
  console.log('   Giảng viên Nguyễn Văn Giảng: lecturer@fpt.edu.vn / lecturer123')
  console.log('   Học sinh 1 (Lê Văn An): student1@fpt.edu.vn / student123 (môn PRM, CSD, PRN)')
  console.log('   Học sinh 2 (Phạm Thị Bình): student2@fpt.edu.vn / student123 (môn PRM, CSD, PRN)')
  console.log('   Học sinh 3 (Hoàng Văn Cường): student3@fpt.edu.vn / student123 (môn PRM, CSD, PRN)')
}

main()
  .catch((err) => {
    console.error('❌ Lỗi không xác định khi seed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
