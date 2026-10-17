BEGIN TRY

BEGIN TRAN;

-- ============================================================
-- Add missing columns to [User] table
-- RequirePasswordChange, ResetPasswordOtp, ResetPasswordOtpExpiry
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[User]')
    AND name = N'RequirePasswordChange'
)
BEGIN
  ALTER TABLE [dbo].[User] ADD [RequirePasswordChange] BIT DEFAULT 0;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[User]')
    AND name = N'ResetPasswordOtp'
)
BEGIN
  ALTER TABLE [dbo].[User] ADD [ResetPasswordOtp] NVARCHAR(1000);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[User]')
    AND name = N'ResetPasswordOtpExpiry'
)
BEGIN
  ALTER TABLE [dbo].[User] ADD [ResetPasswordOtpExpiry] DATETIME2;
END;

-- ============================================================
-- Add missing [Note] column to [Class] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Class]')
    AND name = N'Note'
)
BEGIN
  ALTER TABLE [dbo].[Class] ADD [Note] NVARCHAR(1000);
END;

-- ============================================================
-- Fix [Class] unique constraint:
-- Old: UNIQUE([ClassCode])
-- New: UNIQUE([ClassCode], [SubjectId], [SemesterId])
-- ============================================================
IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[Class]')
    AND name = N'Class_ClassCode_key'
)
BEGIN
  ALTER TABLE [dbo].[Class] DROP CONSTRAINT [Class_ClassCode_key];
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[Class]')
    AND name = N'Class_ClassCode_SubjectId_SemesterId_key'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [Class_ClassCode_SubjectId_SemesterId_key]
    ON [dbo].[Class] ([ClassCode], [SubjectId], [SemesterId]);
END;

-- ============================================================
-- Add missing [Semester] (Int) column to [Subject] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Subject]')
    AND name = N'Semester'
)
BEGIN
  ALTER TABLE [dbo].[Subject] ADD [Semester] INT;
END;

-- ============================================================
-- Add missing [Season] column to [Semester] table
-- Fix unique constraint: Old UNIQUE([Code]) -> New UNIQUE([Season],[Code])
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Semester]')
    AND name = N'Season'
)
BEGIN
  ALTER TABLE [dbo].[Semester] ADD [Season] NVARCHAR(1000);
END;

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[Semester]')
    AND name = N'Semester_Code_key'
)
BEGIN
  ALTER TABLE [dbo].[Semester] DROP CONSTRAINT [Semester_Code_key];
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[Semester]')
    AND name = N'Semester_Season_Code_key'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX [Semester_Season_Code_key]
    ON [dbo].[Semester] ([Season], [Code]);
END;

-- ============================================================
-- Add missing [StudentFeedback] column to [Submission] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Submission]')
    AND name = N'StudentFeedback'
)
BEGIN
  ALTER TABLE [dbo].[Submission] ADD [StudentFeedback] NVARCHAR(1000);
END;

-- ============================================================
-- Add missing [ReportData] column to [Submission] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Submission]')
    AND name = N'ReportData'
)
BEGIN
  ALTER TABLE [dbo].[Submission] ADD [ReportData] NVARCHAR(MAX);
END;

-- ============================================================
-- Add missing [StartDate] and [DueDate] columns to [Exam] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Exam]')
    AND name = N'StartDate'
)
BEGIN
  ALTER TABLE [dbo].[Exam] ADD [StartDate] DATETIME2;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Exam]')
    AND name = N'DueDate'
)
BEGIN
  ALTER TABLE [dbo].[Exam] ADD [DueDate] DATETIME2;
END;

-- ============================================================
-- Create [SemesterSubject] table if not exists
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[SemesterSubject]')
    AND type = 'U'
)
BEGIN
  CREATE TABLE [dbo].[SemesterSubject] (
    [SemesterId] UNIQUEIDENTIFIER NOT NULL,
    [SubjectId]  UNIQUEIDENTIFIER NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [SemesterSubject_pkey] PRIMARY KEY CLUSTERED ([SemesterId], [SubjectId])
  );

  ALTER TABLE [dbo].[SemesterSubject]
    ADD CONSTRAINT [SemesterSubject_SemesterId_fkey]
    FOREIGN KEY ([SemesterId]) REFERENCES [dbo].[Semester]([Id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

  ALTER TABLE [dbo].[SemesterSubject]
    ADD CONSTRAINT [SemesterSubject_SubjectId_fkey]
    FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id])
    ON DELETE CASCADE ON UPDATE NO ACTION;
END;

-- ============================================================
-- Create [ExamClass] table if not exists
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[ExamClass]')
    AND type = 'U'
)
BEGIN
  CREATE TABLE [dbo].[ExamClass] (
    [ExamId]     UNIQUEIDENTIFIER NOT NULL,
    [ClassId]    UNIQUEIDENTIFIER NOT NULL,
    [AssignedAt] DATETIME2,
    [DueDate]    DATETIME2,
    CONSTRAINT [ExamClass_pkey] PRIMARY KEY CLUSTERED ([ExamId], [ClassId])
  );

  ALTER TABLE [dbo].[ExamClass]
    ADD CONSTRAINT [ExamClass_ClassId_fkey]
    FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

  ALTER TABLE [dbo].[ExamClass]
    ADD CONSTRAINT [ExamClass_ExamId_fkey]
    FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

-- ============================================================
-- Create [Appeal] table if not exists
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Appeal]')
    AND type = 'U'
)
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
  );

  ALTER TABLE [dbo].[Appeal]
    ADD CONSTRAINT [Appeal_SubmissionId_fkey]
    FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

  ALTER TABLE [dbo].[Appeal]
    ADD CONSTRAINT [Appeal_StudentId_fkey]
    FOREIGN KEY ([StudentId]) REFERENCES [dbo].[User]([Id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

-- ============================================================
-- Create [PendingEnrollment] table if not exists
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[PendingEnrollment]')
    AND type = 'U'
)
BEGIN
  CREATE TABLE [dbo].[PendingEnrollment] (
    [Id]           UNIQUEIDENTIFIER NOT NULL,
    [UserId]       UNIQUEIDENTIFIER NOT NULL,
    [SemesterCode] NVARCHAR(1000),
    [ClassCode]    NVARCHAR(1000),
    [SubjectCode]  NVARCHAR(1000),
    [Status]       NVARCHAR(1000) DEFAULT N'Pending',
    [CreatedAt]    DATETIME2 DEFAULT GETDATE(),
    [UpdatedAt]    DATETIME2,
    CONSTRAINT [PendingEnrollment_pkey] PRIMARY KEY CLUSTERED ([Id])
  );

  ALTER TABLE [dbo].[PendingEnrollment]
    ADD CONSTRAINT [PendingEnrollment_UserId_fkey]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id])
    ON DELETE CASCADE ON UPDATE NO ACTION;
END;

-- ============================================================
-- Fix [InstructorClass] FK: cascade on delete
-- (safe to drop+re-add since NOT EXISTS check guards it)
-- ============================================================
IF EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'InstructorClass_ClassId_fkey'
    AND parent_object_id = OBJECT_ID(N'[dbo].[InstructorClass]')
)
BEGIN
  -- check if it's already cascade
  IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    WHERE fk.name = N'InstructorClass_ClassId_fkey'
      AND fk.delete_referential_action = 1  -- 1 = CASCADE
  )
  BEGIN
    ALTER TABLE [dbo].[InstructorClass] DROP CONSTRAINT [InstructorClass_ClassId_fkey];
    ALTER TABLE [dbo].[InstructorClass]
      ADD CONSTRAINT [InstructorClass_ClassId_fkey]
      FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id])
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END;
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
