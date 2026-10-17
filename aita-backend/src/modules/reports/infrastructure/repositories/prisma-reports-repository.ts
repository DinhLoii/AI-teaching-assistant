import { IReportsRepository } from '../../domain/repositories/reports-repository.interface.js'

export class PrismaReportsRepository implements IReportsRepository {
    constructor(private readonly prisma: any) { }

    getActiveSemester() {
        return this.prisma.semester.findFirst({ where: { IsActive: true, StartDate: { not: null }, EndDate: { not: null } }, orderBy: { StartDate: 'desc' }, select: { StartDate: true, EndDate: true } })
    }

    async getAnalytics(start: Date, end: Date) {
        // One SQL statement: all cards/charts share a consistent PostgreSQL snapshot.
        const rows = await this.prisma.$queryRaw`
          WITH accounts AS (
            SELECT u."Id", CASE
              WHEN EXISTS (SELECT 1 FROM "UserRole" ur JOIN "Role" r ON r."Id"=ur."RoleId" WHERE ur."UserId"=u."Id" AND upper(r."RoleName")='ADMIN') THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM "UserRole" ur JOIN "Role" r ON r."Id"=ur."RoleId" WHERE ur."UserId"=u."Id" AND upper(r."RoleName")='LECTURER') THEN 'lecturer'
              WHEN EXISTS (SELECT 1 FROM "UserRole" ur JOIN "Role" r ON r."Id"=ur."RoleId" WHERE ur."UserId"=u."Id" AND upper(r."RoleName")='STUDENT') THEN 'student'
              ELSE 'other' END AS role FROM "User" u
          ), active_submissions AS (
            SELECT s.*, COALESCE(NULLIF(e."TotalPoints",0), NULLIF(s."TotalScore",0)) AS max_score,
              row_number() OVER (PARTITION BY COALESCE(s."StudentId",s."Id"),COALESCE(s."ExamId",s."Id"),s."ClassId" ORDER BY s."SubmittedAt" DESC NULLS LAST,s."AttemptNumber" DESC NULLS LAST,s."Id" DESC) latest_rank
            FROM "Submission" s LEFT JOIN "Exam" e ON e."Id"=s."ExamId" WHERE e."IsDeleted" IS DISTINCT FROM true
          ), scores AS (
            SELECT s."FinalScore" / s.max_score * 10 AS score FROM active_submissions s
            WHERE s."SubmittedAt">=(${start}::timestamptz AT TIME ZONE 'UTC') AND s."SubmittedAt"<(${end}::timestamptz AT TIME ZONE 'UTC')
              AND s.latest_rank=1 AND upper(s."ReviewStatus")='PUBLISHED'
              AND s."FinalScore">=0 AND s.max_score>0 AND s."FinalScore"<=s.max_score
          ), days AS (
            SELECT generate_series((${start}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
              ((${end}::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1), interval '1 day')::date AS day
          ), submitted AS (
            SELECT ("SubmittedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, count(*)::int AS n
            FROM active_submissions WHERE "SubmittedAt">=(${start}::timestamptz AT TIME ZONE 'UTC') AND "SubmittedAt"<(${end}::timestamptz AT TIME ZONE 'UTC') GROUP BY 1
          ), graded AS (
            SELECT ("GradedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, count(*)::int AS n
            FROM active_submissions WHERE "GradedAt">=(${start}::timestamptz AT TIME ZONE 'UTC') AND "GradedAt"<(${end}::timestamptz AT TIME ZONE 'UTC')
              AND upper("GradingStatus") IN ('GRADED','COMPLETED','SUCCESS') GROUP BY 1
          ) SELECT json_build_object(
            'summary', json_build_object(
              'users',(SELECT count(*)::int FROM accounts), 'classes',(SELECT count(*)::int FROM "Class"),
              'exams',(SELECT count(*)::int FROM "Exam" WHERE "IsDeleted" IS DISTINCT FROM true), 'subjects',(SELECT count(*)::int FROM "Subject"),
              'submissions',(SELECT COALESCE(sum(n),0)::int FROM submitted), 'evaluated',(SELECT COALESCE(sum(n),0)::int FROM graded),
              'auditLogs',(SELECT count(*)::int FROM "AuditLog" WHERE "CreatedAt">=(${start}::timestamptz AT TIME ZONE 'UTC') AND "CreatedAt"<(${end}::timestamptz AT TIME ZONE 'UTC')),
              'assignedClasses',(SELECT count(*)::int FROM "Class" c WHERE EXISTS (SELECT 1 FROM "InstructorClass" i WHERE i."ClassId"=c."Id")),
              'assignedLecturers',(SELECT count(DISTINCT i."UserId")::int FROM "InstructorClass" i JOIN accounts a ON a."Id"=i."UserId" WHERE a.role='lecturer')
            ),
            'roles',(SELECT json_agg(json_build_object('role',role,'count',n) ORDER BY role) FROM (SELECT role,count(*)::int n FROM accounts GROUP BY role) x),
            'trend',(SELECT json_agg(json_build_object('date',to_char(d.day,'YYYY-MM-DD'),'submissions',COALESCE(s.n,0),'evaluated',COALESCE(g.n,0)) ORDER BY d.day) FROM days d LEFT JOIN submitted s USING(day) LEFT JOIN graded g USING(day)),
            'grades',json_build_object('count',(SELECT count(*)::int FROM scores),'average',(SELECT round(avg(score),2) FROM scores),'passed',(SELECT count(*)::int FROM scores WHERE score>=5),
              'bins',json_build_array((SELECT count(*)::int FROM scores WHERE score>=9),(SELECT count(*)::int FROM scores WHERE score>=8 AND score<9),(SELECT count(*)::int FROM scores WHERE score>=6.5 AND score<8),(SELECT count(*)::int FROM scores WHERE score>=5 AND score<6.5),(SELECT count(*)::int FROM scores WHERE score<5))),
            'majors',NULL
          ) AS report
        `
        const report = rows[0].report
        return { ...report, roles: report.roles || [], trend: report.trend || [] }
    }
}
