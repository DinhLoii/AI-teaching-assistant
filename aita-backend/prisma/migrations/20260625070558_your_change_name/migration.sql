BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AiUsageLog] ALTER COLUMN [CostEstimate] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[CriterionScore] ALTER COLUMN [AiScore] DECIMAL NULL;
ALTER TABLE [dbo].[CriterionScore] ALTER COLUMN [MaxScore] DECIMAL NULL;
ALTER TABLE [dbo].[CriterionScore] ALTER COLUMN [InstructorScore] DECIMAL NULL;
ALTER TABLE [dbo].[CriterionScore] ALTER COLUMN [EffectiveScore] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[Exam] ALTER COLUMN [TotalPoints] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[ExamSection] ALTER COLUMN [MaxPoints] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[ExecutionResult] ALTER COLUMN [Score] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[GradingSession] ALTER COLUMN [TotalScore] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[RubricCriterion] ALTER COLUMN [MaxPoints] DECIMAL NULL;
ALTER TABLE [dbo].[RubricCriterion] ALTER COLUMN [Weight] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[RubricRule] ALTER COLUMN [MaxPoints] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[RuleScore] ALTER COLUMN [AiScore] DECIMAL NULL;
ALTER TABLE [dbo].[RuleScore] ALTER COLUMN [MaxScore] DECIMAL NULL;
ALTER TABLE [dbo].[RuleScore] ALTER COLUMN [InstructorScore] DECIMAL NULL;
ALTER TABLE [dbo].[RuleScore] ALTER COLUMN [EffectiveScore] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[Submission] ALTER COLUMN [TotalScore] DECIMAL NULL;
ALTER TABLE [dbo].[Submission] ALTER COLUMN [FinalScore] DECIMAL NULL;

-- AlterTable
ALTER TABLE [dbo].[TestCase] ALTER COLUMN [Points] DECIMAL NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
