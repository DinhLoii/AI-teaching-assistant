import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function runMigration() {
    const sqlPath = join(__dirname, '../prisma/migrations/20260710025229_add_missing_columns/migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // Split by GO statements (SQL Server batch separator) if any, or run as single batch
    // Since the file uses BEGIN TRY/COMMIT, run it as a whole
    // Prisma's queryRawUnsafe runs one statement at a time, so we need to split
    // We'll split on newlines and run individual ALTER TABLE statements
    const statements = []
    const lines = sql.split('\n')
    let current = []
    let inIf = 0

    for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('BEGIN TRY') || trimmed.startsWith('BEGIN TRAN')) continue
        if (trimmed.startsWith('COMMIT TRAN') || trimmed.startsWith('END TRY') || trimmed.startsWith('END CATCH')) continue
        if (trimmed.startsWith('BEGIN CATCH') || trimmed === 'IF @@TRANCOUNT > 0') continue
        if (trimmed.startsWith('ROLLBACK TRAN') || trimmed === 'THROW') continue

        if (trimmed.startsWith('IF NOT EXISTS') || trimmed.startsWith('IF EXISTS')) {
            inIf++
        }
        if (trimmed === 'BEGIN') inIf++
        if (trimmed === 'END;') {
            inIf = Math.max(0, inIf - 1)
            current.push(line)
            if (inIf === 0) {
                statements.push(current.join('\n'))
                current = []
            }
            continue
        }
        if (inIf > 0) {
            current.push(line)
        } else if (trimmed && !trimmed.startsWith('--')) {
            // standalone statements
            if (trimmed.endsWith(';')) {
                current.push(line)
                statements.push(current.join('\n'))
                current = []
            } else {
                current.push(line)
            }
        }
    }

    // Better approach: just run each ALTER/CREATE/IF-block as raw
    // Use a simpler method: collect the whole SQL and use executeRaw with individual blocks

    // Simpler: just run the individual atomic SQL statements
    const atomicStatements = [
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[User]') AND name = N'RequirePasswordChange')
     BEGIN ALTER TABLE [dbo].[User] ADD [RequirePasswordChange] BIT DEFAULT 0 END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[User]') AND name = N'ResetPasswordOtp')
     BEGIN ALTER TABLE [dbo].[User] ADD [ResetPasswordOtp] NVARCHAR(1000) END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[User]') AND name = N'ResetPasswordOtpExpiry')
     BEGIN ALTER TABLE [dbo].[User] ADD [ResetPasswordOtpExpiry] DATETIME2 END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Class]') AND name = N'Note')
     BEGIN ALTER TABLE [dbo].[Class] ADD [Note] NVARCHAR(1000) END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Subject]') AND name = N'Semester')
     BEGIN ALTER TABLE [dbo].[Subject] ADD [Semester] INT END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Semester]') AND name = N'Season')
     BEGIN ALTER TABLE [dbo].[Semester] ADD [Season] NVARCHAR(1000) END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Submission]') AND name = N'StudentFeedback')
     BEGIN ALTER TABLE [dbo].[Submission] ADD [StudentFeedback] NVARCHAR(1000) END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Submission]') AND name = N'ReportData')
     BEGIN ALTER TABLE [dbo].[Submission] ADD [ReportData] NVARCHAR(MAX) END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exam]') AND name = N'StartDate')
     BEGIN ALTER TABLE [dbo].[Exam] ADD [StartDate] DATETIME2 END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exam]') AND name = N'DueDate')
     BEGIN ALTER TABLE [dbo].[Exam] ADD [DueDate] DATETIME2 END`,

        // Fix Class unique constraint
        `IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Class]') AND name = N'Class_ClassCode_key')
     BEGIN DROP INDEX [Class_ClassCode_key] ON [dbo].[Class] END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Class]') AND name = N'Class_ClassCode_SubjectId_SemesterId_key')
     BEGIN CREATE UNIQUE NONCLUSTERED INDEX [Class_ClassCode_SubjectId_SemesterId_key] ON [dbo].[Class] ([ClassCode], [SubjectId], [SemesterId]) END`,

        // Fix Semester unique constraint
        `IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Semester]') AND name = N'Semester_Code_key')
     BEGIN DROP CONSTRAINT [Semester_Code_key] ON [dbo].[Semester] END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Semester]') AND name = N'Semester_Season_Code_key')
     BEGIN CREATE UNIQUE NONCLUSTERED INDEX [Semester_Season_Code_key] ON [dbo].[Semester] ([Season], [Code]) END`,

        // SemesterSubject table
        `IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SemesterSubject]') AND type = 'U')
     BEGIN
       CREATE TABLE [dbo].[SemesterSubject] (
         [SemesterId] UNIQUEIDENTIFIER NOT NULL,
         [SubjectId]  UNIQUEIDENTIFIER NOT NULL,
         [AssignedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
         CONSTRAINT [SemesterSubject_pkey] PRIMARY KEY CLUSTERED ([SemesterId], [SubjectId])
       )
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'SemesterSubject_SemesterId_fkey')
     BEGIN
       ALTER TABLE [dbo].[SemesterSubject]
       ADD CONSTRAINT [SemesterSubject_SemesterId_fkey]
       FOREIGN KEY ([SemesterId]) REFERENCES [dbo].[Semester]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'SemesterSubject_SubjectId_fkey')
     BEGIN
       ALTER TABLE [dbo].[SemesterSubject]
       ADD CONSTRAINT [SemesterSubject_SubjectId_fkey]
       FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
     END`,

        // ExamClass table
        `IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ExamClass]') AND type = 'U')
     BEGIN
       CREATE TABLE [dbo].[ExamClass] (
         [ExamId]     UNIQUEIDENTIFIER NOT NULL,
         [ClassId]    UNIQUEIDENTIFIER NOT NULL,
         [AssignedAt] DATETIME2,
         [DueDate]    DATETIME2,
         CONSTRAINT [ExamClass_pkey] PRIMARY KEY CLUSTERED ([ExamId], [ClassId])
       )
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'ExamClass_ClassId_fkey')
     BEGIN
       ALTER TABLE [dbo].[ExamClass]
       ADD CONSTRAINT [ExamClass_ClassId_fkey]
       FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'ExamClass_ExamId_fkey')
     BEGIN
       ALTER TABLE [dbo].[ExamClass]
       ADD CONSTRAINT [ExamClass_ExamId_fkey]
       FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
     END`,

        // Appeal table
        `IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Appeal]') AND type = 'U')
     BEGIN
       CREATE TABLE [dbo].[Appeal] (
         [Id]           UNIQUEIDENTIFIER NOT NULL,
         [SubmissionId] UNIQUEIDENTIFIER,
         [StudentId]    UNIQUEIDENTIFIER,
         [Reason]       NVARCHAR(1000),
         [Status]       NVARCHAR(1000),
         [CreatedAt]    DATETIME2,
         [ResolvedAt]   DATETIME2,
         [Resolution]   NVARCHAR(1000),
         CONSTRAINT [Appeal_pkey] PRIMARY KEY CLUSTERED ([Id])
       )
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'Appeal_SubmissionId_fkey')
     BEGIN
       ALTER TABLE [dbo].[Appeal]
       ADD CONSTRAINT [Appeal_SubmissionId_fkey]
       FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'Appeal_StudentId_fkey')
     BEGIN
       ALTER TABLE [dbo].[Appeal]
       ADD CONSTRAINT [Appeal_StudentId_fkey]
       FOREIGN KEY ([StudentId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
     END`,

        // PendingEnrollment table
        `IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PendingEnrollment]') AND type = 'U')
     BEGIN
       CREATE TABLE [dbo].[PendingEnrollment] (
         [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
         [UserId]       UNIQUEIDENTIFIER NOT NULL,
         [SemesterCode] NVARCHAR(1000),
         [ClassCode]    NVARCHAR(1000),
         [SubjectCode]  NVARCHAR(1000),
         [Status]       NVARCHAR(1000) DEFAULT N'Pending',
         [CreatedAt]    DATETIME2 DEFAULT GETDATE(),
         [UpdatedAt]    DATETIME2,
         CONSTRAINT [PendingEnrollment_pkey] PRIMARY KEY CLUSTERED ([Id])
       )
     END`,

        `IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'PendingEnrollment_UserId_fkey')
     BEGIN
       ALTER TABLE [dbo].[PendingEnrollment]
       ADD CONSTRAINT [PendingEnrollment_UserId_fkey]
       FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE CASCADE ON UPDATE NO ACTION
     END`,
    ]

    console.log(`Running ${atomicStatements.length} migration statements...`)

    for (let i = 0; i < atomicStatements.length; i++) {
        const stmt = atomicStatements[i]
        try {
            await prisma.$executeRawUnsafe(stmt)
            console.log(`  [${i + 1}/${atomicStatements.length}] ✅ OK`)
        } catch (err) {
            console.error(`  [${i + 1}/${atomicStatements.length}] ❌ ERROR: ${err.message}`)
            console.error(`  Statement:\n${stmt.substring(0, 200)}...`)
        }
    }

    console.log('\n✅ Migration completed!')
    await prisma.$disconnect()
}

runMigration().catch(async (err) => {
    console.error('Fatal error:', err)
    await prisma.$disconnect()
    process.exit(1)
})
