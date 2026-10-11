import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'

async function seedUsers() {
  console.log('🌱 Bắt đầu tạo dữ liệu thật cho Giảng viên và Sinh viên...')

  try {
    await prisma.$connect()
    console.log('✓ Kết nối Database thành công.')
  } catch (error: any) {
    console.error('❌ Lỗi kết nối Database:', error?.message)
    process.exit(1)
  }

  // Precompute hashes once for high speed
  const lecturerHash = await bcrypt.hash('lecturer123', 8)
  const studentHash = await bcrypt.hash('student123', 8)

  // 1. Ensure Roles exist
  const roles = ['ADMIN', 'LECTURER', 'STUDENT']
  const roleMap: Record<string, string> = {}
  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { RoleName: r },
      update: {},
      create: { RoleName: r },
    })
    roleMap[r] = roleRecord.Id
  }

  // 2. Seed 5 Giảng viên (LECTURERS)
  const lecturers = [
    {
      email: 'lecturer@fpt.edu.vn',
      code: 'GV001',
      fullName: 'Nguyễn Văn Giảng',
      phone: '0901234561',
      status: 'Active',
    },
    {
      email: 'lecturer.tuan@fpt.edu.vn',
      code: 'GV002',
      fullName: 'Trần Minh Tuấn',
      phone: '0901234562',
      status: 'Active',
    },
    {
      email: 'lecturer.mai@fpt.edu.vn',
      code: 'GV003',
      fullName: 'Lê Thị Mai',
      phone: '0901234563',
      status: 'Active',
    },
    {
      email: 'lecturer.nam@fpt.edu.vn',
      code: 'GV004',
      fullName: 'Phạm Hoàng Nam',
      phone: '0901234564',
      status: 'Active',
    },
    {
      email: 'lecturer.dang@fpt.edu.vn',
      code: 'GV005',
      fullName: 'Vũ Hải Đăng',
      phone: '0901234565',
      status: 'Active',
    },
  ]

  console.log(`\n👨‍🏫 Đang tạo/cập nhật ${lecturers.length} Giảng viên...`)
  for (const lec of lecturers) {
    const user = await prisma.user.upsert({
      where: { Email: lec.email },
      update: {
        FullName: lec.fullName,
        LecturerCode: lec.code,
        Phone: lec.phone,
        Status: lec.status,
      },
      create: {
        Email: lec.email,
        PasswordHash: lecturerHash,
        FullName: lec.fullName,
        LecturerCode: lec.code,
        Phone: lec.phone,
        Status: lec.status,
      },
    })

    await prisma.userRole.upsert({
      where: { UserId_RoleId: { UserId: user.Id, RoleId: roleMap['LECTURER'] } },
      update: {},
      create: { UserId: user.Id, RoleId: roleMap['LECTURER'] },
    })
    console.log(`  ✓ Giảng viên: ${lec.fullName} (${lec.code}) - ${lec.email}`)
  }

  // 3. Seed 12 Sinh viên (STUDENTS) theo Khóa và Ngành
  const students = [
    // K17 - SE
    {
      email: 'student.se1701@fpt.edu.vn',
      code: 'SE170101',
      fullName: 'Nguyễn Văn Quý',
      phone: '0912001001',
      status: 'Active',
    },
    {
      email: 'student.se1702@fpt.edu.vn',
      code: 'SE170102',
      fullName: 'Trần Minh Hoàng',
      phone: '0912001002',
      status: 'Active',
    },
    // K18 - IA
    {
      email: 'student.ia1801@fpt.edu.vn',
      code: 'IA180201',
      fullName: 'Lê Thu Trang',
      phone: '0912001003',
      status: 'Active',
    },
    {
      email: 'student.ia1802@fpt.edu.vn',
      code: 'IA180202',
      fullName: 'Đặng Tuấn Anh',
      phone: '0912001004',
      status: 'Active',
    },
    // K18 - AI
    {
      email: 'student.ai1801@fpt.edu.vn',
      code: 'AI180301',
      fullName: 'Bùi Gia Huy',
      phone: '0912001005',
      status: 'Active',
    },
    {
      email: 'student.ai1802@fpt.edu.vn',
      code: 'AI180302',
      fullName: 'Đỗ Phương Linh',
      phone: '0912001006',
      status: 'Active',
    },
    // K19 - IS
    {
      email: 'student.is1901@fpt.edu.vn',
      code: 'IS190401',
      fullName: 'Hoàng Đức Thắng',
      phone: '0912001007',
      status: 'Active',
    },
    {
      email: 'student.is1902@fpt.edu.vn',
      code: 'IS190402',
      fullName: 'Vũ Mai Phương',
      phone: '0912001008',
      status: 'Active',
    },
    // K19 - GD
    {
      email: 'student.gd1901@fpt.edu.vn',
      code: 'GD190501',
      fullName: 'Ngô Bảo Khánh',
      phone: '0912001009',
      status: 'Active',
    },
    {
      email: 'student.gd1902@fpt.edu.vn',
      code: 'GD190502',
      fullName: 'Đinh Thị Ngọc Ánh',
      phone: '0912001010',
      status: 'Active',
    },
    // K18 - SE
    {
      email: 'student.se1801@fpt.edu.vn',
      code: 'SE180105',
      fullName: 'Phan Anh Dũng',
      phone: '0912001011',
      status: 'Active',
    },
    // K19 - AI
    {
      email: 'student.ai1901@fpt.edu.vn',
      code: 'AI190308',
      fullName: 'Trịnh Thùy Dương',
      phone: '0912001012',
      status: 'Active',
    },
  ]

  console.log(`\n🎓 Đang tạo/cập nhật ${students.length} Sinh viên...`)
  for (const st of students) {
    const user = await prisma.user.upsert({
      where: { Email: st.email },
      update: {
        FullName: st.fullName,
        StudentCode: st.code,
        Phone: st.phone,
        Status: st.status,
      },
      create: {
        Email: st.email,
        PasswordHash: studentHash,
        FullName: st.fullName,
        StudentCode: st.code,
        Phone: st.phone,
        Status: st.status,
      },
    })

    await prisma.userRole.upsert({
      where: { UserId_RoleId: { UserId: user.Id, RoleId: roleMap['STUDENT'] } },
      update: {},
      create: { UserId: user.Id, RoleId: roleMap['STUDENT'] },
    })
    console.log(`  ✓ Sinh viên: ${st.fullName} (${st.code}) - ${st.email}`)
  }

  console.log('\n🎉 Hoàn tất gieo dữ liệu thật cho Giảng viên & Sinh viên!')
}

seedUsers()
  .catch((e) => {
    console.error('Lỗi khi chạy seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
