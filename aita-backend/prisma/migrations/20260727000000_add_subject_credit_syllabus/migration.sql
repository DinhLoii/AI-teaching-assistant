BEGIN TRY

BEGIN TRAN;

-- ============================================================
-- Add missing [Credit] column to [Subject] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Subject]')
    AND name = N'Credit'
)
BEGIN
  ALTER TABLE [dbo].[Subject] ADD [Credit] INT;
END;

-- ============================================================
-- Add missing [SyllabusData] column to [Subject] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Subject]')
    AND name = N'SyllabusData'
)
BEGIN
  ALTER TABLE [dbo].[Subject] ADD [SyllabusData] NVARCHAR(MAX);
END;

-- ============================================================
-- Add missing [LecturerCode] column to [User] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[User]')
    AND name = N'LecturerCode'
)
BEGIN
  ALTER TABLE [dbo].[User] ADD [LecturerCode] NVARCHAR(1000);
END;

-- ============================================================
-- Add missing [WeightPercentage] column to [Exam] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Exam]')
    AND name = N'WeightPercentage'
)
BEGIN
  ALTER TABLE [dbo].[Exam] ADD [WeightPercentage] DECIMAL(5, 2);
END;

-- ============================================================
-- Add missing [GradingStrategy] column to [Exam] table
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Exam]')
    AND name = N'GradingStrategy'
)
BEGIN
  ALTER TABLE [dbo].[Exam] ADD [GradingStrategy] NVARCHAR(1000) DEFAULT N'CONTINUOUS_QUEUE';
END;

-- ============================================================
-- Widen [AiGeneratedContent] and [OriginalPrompt] on [Exam]
-- from NVARCHAR(1000) to NVARCHAR(MAX) to match schema
-- ============================================================
DECLARE @examColType_AiGen NVARCHAR(50);
SELECT @examColType_AiGen = c.max_length
FROM sys.columns c
WHERE c.object_id = OBJECT_ID(N'[dbo].[Exam]')
  AND c.name = N'AiGeneratedContent';

IF @examColType_AiGen IS NOT NULL AND @examColType_AiGen <> '-1'
BEGIN
  ALTER TABLE [dbo].[Exam] ALTER COLUMN [AiGeneratedContent] NVARCHAR(MAX);
END;

DECLARE @examColType_OrigPrompt NVARCHAR(50);
SELECT @examColType_OrigPrompt = c.max_length
FROM sys.columns c
WHERE c.object_id = OBJECT_ID(N'[dbo].[Exam]')
  AND c.name = N'OriginalPrompt';

IF @examColType_OrigPrompt IS NOT NULL AND @examColType_OrigPrompt <> '-1'
BEGIN
  ALTER TABLE [dbo].[Exam] ALTER COLUMN [OriginalPrompt] NVARCHAR(MAX);
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
