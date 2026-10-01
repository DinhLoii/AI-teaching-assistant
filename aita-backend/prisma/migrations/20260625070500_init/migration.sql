BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Email] NVARCHAR(1000),
    [PasswordHash] NVARCHAR(1000),
    [FullName] NVARCHAR(1000),
    [StudentCode] NVARCHAR(1000),
    [Phone] NVARCHAR(1000),
    [Avatar] NVARCHAR(1000),
    [Status] NVARCHAR(1000),
    [LastLoginAt] DATETIME2,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [User_Email_key] UNIQUE NONCLUSTERED ([Email])
);

-- CreateTable
CREATE TABLE [dbo].[Class] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ClassCode] NVARCHAR(1000),
    [SubjectId] UNIQUEIDENTIFIER,
    [SemesterId] UNIQUEIDENTIFIER,
    [Status] NVARCHAR(1000),
    CONSTRAINT [Class_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Class_ClassCode_key] UNIQUE NONCLUSTERED ([ClassCode])
);

-- CreateTable
CREATE TABLE [dbo].[Submission] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [StudentId] UNIQUEIDENTIFIER,
    [ClassId] UNIQUEIDENTIFIER,
    [AttemptNumber] INT,
    [IsLatest] BIT,
    [SubmittedAt] DATETIME2,
    [ZipFileUrl] NVARCHAR(1000),
    [GradingStatus] NVARCHAR(1000),
    [ReviewStatus] NVARCHAR(1000),
    [TotalScore] DECIMAL,
    [FinalScore] DECIMAL,
    [InstructorFeedback] NVARCHAR(1000),
    [ReviewedBy] UNIQUEIDENTIFIER,
    [ReviewedAt] DATETIME2,
    [GradedAt] DATETIME2,
    CONSTRAINT [Submission_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Submission_StudentId_ExamId_ClassId_AttemptNumber_idx] UNIQUE NONCLUSTERED ([StudentId],[ExamId],[ClassId],[AttemptNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Subject] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [SubjectCode] NVARCHAR(1000),
    [SubjectName] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [IsActive] BIT,
    CONSTRAINT [Subject_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Subject_SubjectCode_key] UNIQUE NONCLUSTERED ([SubjectCode])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Title] NVARCHAR(1000),
    [Message] NVARCHAR(1000),
    [Type] NVARCHAR(1000),
    [ReferenceId] UNIQUEIDENTIFIER,
    [ReferenceType] NVARCHAR(1000),
    [CreatedBy] UNIQUEIDENTIFIER,
    [CreatedAt] DATETIME2,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[AiApiKey] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Provider] NVARCHAR(1000),
    [KeyValue] NVARCHAR(1000),
    [Label] NVARCHAR(1000),
    [IsActive] BIT,
    [IsExhausted] BIT,
    [LastUsedAt] DATETIME2,
    [TotalUsageCount] INT,
    CONSTRAINT [AiApiKey_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[AiUsageLog] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [UserId] UNIQUEIDENTIFIER,
    [ExamId] UNIQUEIDENTIFIER,
    [SubmissionId] UNIQUEIDENTIFIER,
    [RequestId] NVARCHAR(1000),
    [Provider] NVARCHAR(1000),
    [ActionType] NVARCHAR(1000),
    [ModelUsed] NVARCHAR(1000),
    [PromptTokens] INT,
    [CompletionTokens] INT,
    [CostEstimate] DECIMAL,
    [DurationMs] INT,
    [IsSuccess] BIT,
    [ErrorMessage] NVARCHAR(1000),
    [CreatedAt] DATETIME2,
    CONSTRAINT [AiUsageLog_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[AssignmentTemplate] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [SubjectId] UNIQUEIDENTIFIER,
    [Name] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [AssignmentType] NVARCHAR(1000),
    [DefaultGradingProfileId] UNIQUEIDENTIFIER,
    [DefaultProjectTypeId] UNIQUEIDENTIFIER,
    [SortOrder] INT,
    [IsActive] BIT,
    CONSTRAINT [AssignmentTemplate_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [EntityName] NVARCHAR(1000),
    [EntityId] UNIQUEIDENTIFIER,
    [Action] NVARCHAR(1000),
    [OldValue] NVARCHAR(1000),
    [NewValue] NVARCHAR(1000),
    [UserId] UNIQUEIDENTIFIER,
    [IpAddress] NVARCHAR(1000),
    [CreatedAt] DATETIME2,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[BuildArtifact] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [GradingSessionId] UNIQUEIDENTIFIER,
    [BuildStatus] NVARCHAR(1000),
    [BuildLog] NVARCHAR(1000),
    [DockerImageId] NVARCHAR(1000),
    [ExecutablePath] NVARCHAR(1000),
    [BuildHash] NVARCHAR(1000),
    [DurationMs] INT,
    CONSTRAINT [BuildArtifact_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[CriterionScore] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [RuleScoreId] UNIQUEIDENTIFIER,
    [RubricCriterionId] UNIQUEIDENTIFIER,
    [AiScore] DECIMAL,
    [MaxScore] DECIMAL,
    [AiReasoning] NVARCHAR(1000),
    [InstructorScore] DECIMAL,
    [IsOverridden] BIT,
    [EffectiveScore] DECIMAL,
    CONSTRAINT [CriterionScore_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Evidence] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [RuleScoreId] UNIQUEIDENTIFIER,
    [EvidenceType] NVARCHAR(1000),
    [Content] NVARCHAR(1000),
    [ImageUrl] NVARCHAR(1000),
    [Caption] NVARCHAR(1000),
    CONSTRAINT [Evidence_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Exam] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Title] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [AssignmentTemplateId] UNIQUEIDENTIFIER,
    [ProjectTypeId] UNIQUEIDENTIFIER,
    [GradingProfileId] UNIQUEIDENTIFIER,
    [SubjectId] UNIQUEIDENTIFIER,
    [ExamType] NVARCHAR(1000),
    [Duration] INT,
    [TotalPoints] DECIMAL,
    [Status] NVARCHAR(1000),
    [SubmissionFormat] NVARCHAR(1000),
    [AiGeneratedContent] NVARCHAR(1000),
    [OriginalPrompt] NVARCHAR(1000),
    [PromptTemplateId] UNIQUEIDENTIFIER,
    [CreatedBy] UNIQUEIDENTIFIER,
    CONSTRAINT [Exam_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ExamAttachment] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [FileName] NVARCHAR(1000),
    [FileUrl] NVARCHAR(1000),
    [FileType] NVARCHAR(1000),
    CONSTRAINT [ExamAttachment_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ExamGenerationHistory] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [Version] INT,
    [Prompt] NVARCHAR(1000),
    [GeneratedContent] NVARCHAR(1000),
    [GeneratedBy] UNIQUEIDENTIFIER,
    CONSTRAINT [ExamGenerationHistory_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ExamSection] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [SectionCode] NVARCHAR(1000),
    [Title] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [MaxPoints] DECIMAL,
    [SortOrder] INT,
    CONSTRAINT [ExamSection_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ExecutionResult] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [GradingJobId] UNIQUEIDENTIFIER,
    [SubmissionId] UNIQUEIDENTIFIER,
    [EngineType] NVARCHAR(1000),
    [ExecutionLabel] NVARCHAR(1000),
    [RawOutput] NVARCHAR(1000),
    [Score] DECIMAL,
    [Status] NVARCHAR(1000),
    [StartedAt] DATETIME2,
    [CompletedAt] DATETIME2,
    [DurationMs] INT,
    CONSTRAINT [ExecutionResult_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[GradingJob] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [GradingSessionId] UNIQUEIDENTIFIER,
    [GradingProfileStepId] UNIQUEIDENTIFIER,
    [Engine] NVARCHAR(1000),
    [Priority] INT,
    [Status] NVARCHAR(1000),
    [TriggeredAt] DATETIME2,
    [CompletedAt] DATETIME2,
    [WorkerNodeId] NVARCHAR(1000),
    CONSTRAINT [GradingJob_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[GradingProfile] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(1000),
    [ProjectTypeId] UNIQUEIDENTIFIER,
    [Description] NVARCHAR(1000),
    [IsActive] BIT,
    CONSTRAINT [GradingProfile_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[GradingProfileStep] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [GradingProfileId] UNIQUEIDENTIFIER,
    [EngineType] NVARCHAR(1000),
    [StepOrder] INT,
    [ConfigJson] NVARCHAR(1000),
    [IsRequired] BIT,
    [TimeoutSeconds] INT,
    CONSTRAINT [GradingProfileStep_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[GradingSession] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [SubmissionId] UNIQUEIDENTIFIER,
    [Version] INT,
    [TriggeredBy] UNIQUEIDENTIFIER,
    [TriggerReason] NVARCHAR(1000),
    [Status] NVARCHAR(1000),
    [TotalScore] DECIMAL,
    [StartedAt] DATETIME2,
    [CompletedAt] DATETIME2,
    CONSTRAINT [GradingSession_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ImportBatch] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [FileName] NVARCHAR(1000),
    [FileUrl] NVARCHAR(1000),
    [Status] NVARCHAR(1000),
    [TotalRows] INT,
    [SuccessCount] INT,
    [ErrorCount] INT,
    [ErrorDetails] NVARCHAR(1000),
    [ImportedBy] UNIQUEIDENTIFIER,
    CONSTRAINT [ImportBatch_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[InstructorClass] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [ClassId] UNIQUEIDENTIFIER NOT NULL,
    [EnrolledAt] DATETIME2,
    CONSTRAINT [InstructorClass_pkey] PRIMARY KEY CLUSTERED ([UserId],[ClassId])
);

-- CreateTable
CREATE TABLE [dbo].[JobDependency] (
    [JobId] UNIQUEIDENTIFIER NOT NULL,
    [DependsOnJobId] UNIQUEIDENTIFIER NOT NULL,
    [DependencyType] NVARCHAR(1000),
    CONSTRAINT [JobDependency_pkey] PRIMARY KEY CLUSTERED ([JobId],[DependsOnJobId])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationRecipient] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [NotificationId] UNIQUEIDENTIFIER,
    [UserId] UNIQUEIDENTIFIER,
    [IsRead] BIT,
    [ReadAt] DATETIME2,
    CONSTRAINT [NotificationRecipient_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectType] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Code] NVARCHAR(1000),
    [DisplayName] NVARCHAR(1000),
    [RequiresSandbox] BIT,
    [SandboxImage] NVARCHAR(1000),
    [BuildCommand] NVARCHAR(1000),
    [RunCommand] NVARCHAR(1000),
    CONSTRAINT [ProjectType_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [ProjectType_Code_key] UNIQUE NONCLUSTERED ([Code])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectTypeComposition] (
    [ParentProjectTypeId] UNIQUEIDENTIFIER NOT NULL,
    [ChildProjectTypeId] UNIQUEIDENTIFIER NOT NULL,
    [Role] NVARCHAR(1000),
    [IsRequired] BIT,
    [SortOrder] INT,
    CONSTRAINT [ProjectTypeComposition_pkey] PRIMARY KEY CLUSTERED ([ParentProjectTypeId],[ChildProjectTypeId])
);

-- CreateTable
CREATE TABLE [dbo].[PromptTemplate] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(1000),
    [SubjectId] UNIQUEIDENTIFIER,
    [ProjectTypeId] UNIQUEIDENTIFIER,
    [Category] NVARCHAR(1000),
    [TemplateContent] NVARCHAR(1000),
    [PlaceholderSchema] NVARCHAR(1000),
    [IsDefault] BIT,
    [IsActive] BIT,
    [UsageCount] INT,
    [CreatedBy] UNIQUEIDENTIFIER,
    CONSTRAINT [PromptTemplate_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ReferenceArtifact] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [ArtifactType] NVARCHAR(1000),
    [ExpectedFor] NVARCHAR(1000),
    [FileName] NVARCHAR(1000),
    [FileUrl] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [SortOrder] INT,
    CONSTRAINT [ReferenceArtifact_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [UserId] UNIQUEIDENTIFIER,
    [Token] NVARCHAR(1000),
    [ExpiresAt] DATETIME2,
    [IsRevoked] BIT,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[OAuthIdentity] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [UserId] UNIQUEIDENTIFIER,
    [Provider] NVARCHAR(1000),
    [ProviderId] NVARCHAR(1000),
    [AccessToken] NVARCHAR(1000),
    [RefreshToken] NVARCHAR(1000),
    CONSTRAINT [OAuthIdentity_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [OAuthIdentity_Provider_ProviderId_key] UNIQUE NONCLUSTERED ([Provider],[ProviderId])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [RoleName] NVARCHAR(1000),
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Role_RoleName_key] UNIQUE NONCLUSTERED ([RoleName])
);

-- CreateTable
CREATE TABLE [dbo].[RubricCriterion] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [RubricRuleId] UNIQUEIDENTIFIER,
    [Description] NVARCHAR(1000),
    [MaxPoints] DECIMAL,
    [Weight] DECIMAL,
    [ValidationType] NVARCHAR(1000),
    [ValidationConfig] NVARCHAR(1000),
    [IsCritical] BIT,
    [SortOrder] INT,
    CONSTRAINT [RubricCriterion_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[RubricRule] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [SectionId] UNIQUEIDENTIFIER,
    [RuleCode] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    [MaxPoints] DECIMAL,
    [EvaluationPrompt] NVARCHAR(1000),
    [ReferenceAnswer] NVARCHAR(1000),
    [RequireImageEvidence] BIT,
    [RequireCodeEvidence] BIT,
    [IsManualOnly] BIT,
    [SortOrder] INT,
    CONSTRAINT [RubricRule_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[RuleScore] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExecutionResultId] UNIQUEIDENTIFIER,
    [RubricRuleId] UNIQUEIDENTIFIER,
    [AiScore] DECIMAL,
    [MaxScore] DECIMAL,
    [AiReasoning] NVARCHAR(1000),
    [InstructorScore] DECIMAL,
    [InstructorComment] NVARCHAR(1000),
    [IsOverridden] BIT,
    [EffectiveScore] DECIMAL,
    CONSTRAINT [RuleScore_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[SampleCode] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [Language] NVARCHAR(1000),
    [Code] NVARCHAR(1000),
    [Explanation] NVARCHAR(1000),
    CONSTRAINT [SampleCode_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[SandboxExecution] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [GradingSessionId] UNIQUEIDENTIFIER,
    [ContainerId] NVARCHAR(1000),
    [SandboxImage] NVARCHAR(1000),
    [Status] NVARCHAR(1000),
    [ExitCode] INT,
    [CpuTimeMs] BIGINT,
    [PeakMemoryKb] BIGINT,
    [NetworkDisabled] BIT,
    [StartedAt] DATETIME2,
    [FinishedAt] DATETIME2,
    [RunLog] NVARCHAR(1000),
    CONSTRAINT [SandboxExecution_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Semester] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [Code] NVARCHAR(1000),
    [StartDate] DATETIME2,
    [EndDate] DATETIME2,
    [IsActive] BIT,
    CONSTRAINT [Semester_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Semester_Code_key] UNIQUE NONCLUSTERED ([Code])
);

-- CreateTable
CREATE TABLE [dbo].[StudentClass] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [ClassId] UNIQUEIDENTIFIER NOT NULL,
    [EnrolledAt] DATETIME2,
    CONSTRAINT [StudentClass_pkey] PRIMARY KEY CLUSTERED ([UserId],[ClassId])
);

-- CreateTable
CREATE TABLE [dbo].[SubjectProjectType] (
    [SubjectId] UNIQUEIDENTIFIER NOT NULL,
    [ProjectTypeId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [SubjectProjectType_pkey] PRIMARY KEY CLUSTERED ([SubjectId],[ProjectTypeId])
);

-- CreateTable
CREATE TABLE [dbo].[SubmissionArtifact] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [SubmissionId] UNIQUEIDENTIFIER,
    [ArtifactType] NVARCHAR(1000),
    [ArtifactLabel] NVARCHAR(1000),
    [FileName] NVARCHAR(1000),
    [FileUrl] NVARCHAR(1000),
    [FileSizeBytes] BIGINT,
    [HashSha256] NVARCHAR(1000),
    [ExtractedPath] NVARCHAR(1000),
    [MimeType] NVARCHAR(1000),
    CONSTRAINT [SubmissionArtifact_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[SystemConfig] (
    [Key] NVARCHAR(1000) NOT NULL,
    [Value] NVARCHAR(1000),
    [Description] NVARCHAR(1000),
    CONSTRAINT [SystemConfig_pkey] PRIMARY KEY CLUSTERED ([Key])
);

-- CreateTable
CREATE TABLE [dbo].[TestCase] (
    [Id] UNIQUEIDENTIFIER NOT NULL,
    [ExamId] UNIQUEIDENTIFIER,
    [Input] NVARCHAR(1000),
    [ExpectedOutput] NVARCHAR(1000),
    [IsHidden] BIT,
    [TimeoutMs] INT,
    [MemoryLimitMb] INT,
    [Points] DECIMAL,
    [SortOrder] INT,
    CONSTRAINT [TestCase_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [RoleId] UNIQUEIDENTIFIER NOT NULL,
    [AssignedAt] DATETIME2,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([UserId],[RoleId])
);

-- AddForeignKey
ALTER TABLE [dbo].[Class] ADD CONSTRAINT [Class_SemesterId_fkey] FOREIGN KEY ([SemesterId]) REFERENCES [dbo].[Semester]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Class] ADD CONSTRAINT [Class_SubjectId_fkey] FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submission] ADD CONSTRAINT [Submission_ClassId_fkey] FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submission] ADD CONSTRAINT [Submission_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submission] ADD CONSTRAINT [Submission_ReviewedBy_fkey] FOREIGN KEY ([ReviewedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submission] ADD CONSTRAINT [Submission_StudentId_fkey] FOREIGN KEY ([StudentId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_CreatedBy_fkey] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AiUsageLog] ADD CONSTRAINT [AiUsageLog_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AiUsageLog] ADD CONSTRAINT [AiUsageLog_SubmissionId_fkey] FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AiUsageLog] ADD CONSTRAINT [AiUsageLog_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AssignmentTemplate] ADD CONSTRAINT [AssignmentTemplate_DefaultGradingProfileId_fkey] FOREIGN KEY ([DefaultGradingProfileId]) REFERENCES [dbo].[GradingProfile]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AssignmentTemplate] ADD CONSTRAINT [AssignmentTemplate_DefaultProjectTypeId_fkey] FOREIGN KEY ([DefaultProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AssignmentTemplate] ADD CONSTRAINT [AssignmentTemplate_SubjectId_fkey] FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BuildArtifact] ADD CONSTRAINT [BuildArtifact_GradingSessionId_fkey] FOREIGN KEY ([GradingSessionId]) REFERENCES [dbo].[GradingSession]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CriterionScore] ADD CONSTRAINT [CriterionScore_RubricCriterionId_fkey] FOREIGN KEY ([RubricCriterionId]) REFERENCES [dbo].[RubricCriterion]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CriterionScore] ADD CONSTRAINT [CriterionScore_RuleScoreId_fkey] FOREIGN KEY ([RuleScoreId]) REFERENCES [dbo].[RuleScore]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evidence] ADD CONSTRAINT [Evidence_RuleScoreId_fkey] FOREIGN KEY ([RuleScoreId]) REFERENCES [dbo].[RuleScore]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_AssignmentTemplateId_fkey] FOREIGN KEY ([AssignmentTemplateId]) REFERENCES [dbo].[AssignmentTemplate]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_CreatedBy_fkey] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_GradingProfileId_fkey] FOREIGN KEY ([GradingProfileId]) REFERENCES [dbo].[GradingProfile]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_ProjectTypeId_fkey] FOREIGN KEY ([ProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_PromptTemplateId_fkey] FOREIGN KEY ([PromptTemplateId]) REFERENCES [dbo].[PromptTemplate]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Exam] ADD CONSTRAINT [Exam_SubjectId_fkey] FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamAttachment] ADD CONSTRAINT [ExamAttachment_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamGenerationHistory] ADD CONSTRAINT [ExamGenerationHistory_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamGenerationHistory] ADD CONSTRAINT [ExamGenerationHistory_GeneratedBy_fkey] FOREIGN KEY ([GeneratedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamSection] ADD CONSTRAINT [ExamSection_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionResult] ADD CONSTRAINT [ExecutionResult_GradingJobId_fkey] FOREIGN KEY ([GradingJobId]) REFERENCES [dbo].[GradingJob]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionResult] ADD CONSTRAINT [ExecutionResult_SubmissionId_fkey] FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingJob] ADD CONSTRAINT [GradingJob_GradingProfileStepId_fkey] FOREIGN KEY ([GradingProfileStepId]) REFERENCES [dbo].[GradingProfileStep]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingJob] ADD CONSTRAINT [GradingJob_GradingSessionId_fkey] FOREIGN KEY ([GradingSessionId]) REFERENCES [dbo].[GradingSession]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingProfile] ADD CONSTRAINT [GradingProfile_ProjectTypeId_fkey] FOREIGN KEY ([ProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingProfileStep] ADD CONSTRAINT [GradingProfileStep_GradingProfileId_fkey] FOREIGN KEY ([GradingProfileId]) REFERENCES [dbo].[GradingProfile]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingSession] ADD CONSTRAINT [GradingSession_SubmissionId_fkey] FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GradingSession] ADD CONSTRAINT [GradingSession_TriggeredBy_fkey] FOREIGN KEY ([TriggeredBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImportBatch] ADD CONSTRAINT [ImportBatch_ImportedBy_fkey] FOREIGN KEY ([ImportedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InstructorClass] ADD CONSTRAINT [InstructorClass_ClassId_fkey] FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InstructorClass] ADD CONSTRAINT [InstructorClass_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[JobDependency] ADD CONSTRAINT [JobDependency_DependsOnJobId_fkey] FOREIGN KEY ([DependsOnJobId]) REFERENCES [dbo].[GradingJob]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[JobDependency] ADD CONSTRAINT [JobDependency_JobId_fkey] FOREIGN KEY ([JobId]) REFERENCES [dbo].[GradingJob]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationRecipient] ADD CONSTRAINT [NotificationRecipient_NotificationId_fkey] FOREIGN KEY ([NotificationId]) REFERENCES [dbo].[Notification]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationRecipient] ADD CONSTRAINT [NotificationRecipient_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectTypeComposition] ADD CONSTRAINT [ProjectTypeComposition_ChildProjectTypeId_fkey] FOREIGN KEY ([ChildProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectTypeComposition] ADD CONSTRAINT [ProjectTypeComposition_ParentProjectTypeId_fkey] FOREIGN KEY ([ParentProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PromptTemplate] ADD CONSTRAINT [PromptTemplate_CreatedBy_fkey] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PromptTemplate] ADD CONSTRAINT [PromptTemplate_ProjectTypeId_fkey] FOREIGN KEY ([ProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PromptTemplate] ADD CONSTRAINT [PromptTemplate_SubjectId_fkey] FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReferenceArtifact] ADD CONSTRAINT [ReferenceArtifact_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OAuthIdentity] ADD CONSTRAINT [OAuthIdentity_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RubricCriterion] ADD CONSTRAINT [RubricCriterion_RubricRuleId_fkey] FOREIGN KEY ([RubricRuleId]) REFERENCES [dbo].[RubricRule]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RubricRule] ADD CONSTRAINT [RubricRule_SectionId_fkey] FOREIGN KEY ([SectionId]) REFERENCES [dbo].[ExamSection]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RuleScore] ADD CONSTRAINT [RuleScore_ExecutionResultId_fkey] FOREIGN KEY ([ExecutionResultId]) REFERENCES [dbo].[ExecutionResult]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RuleScore] ADD CONSTRAINT [RuleScore_RubricRuleId_fkey] FOREIGN KEY ([RubricRuleId]) REFERENCES [dbo].[RubricRule]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SampleCode] ADD CONSTRAINT [SampleCode_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SandboxExecution] ADD CONSTRAINT [SandboxExecution_GradingSessionId_fkey] FOREIGN KEY ([GradingSessionId]) REFERENCES [dbo].[GradingSession]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentClass] ADD CONSTRAINT [StudentClass_ClassId_fkey] FOREIGN KEY ([ClassId]) REFERENCES [dbo].[Class]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentClass] ADD CONSTRAINT [StudentClass_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubjectProjectType] ADD CONSTRAINT [SubjectProjectType_ProjectTypeId_fkey] FOREIGN KEY ([ProjectTypeId]) REFERENCES [dbo].[ProjectType]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubjectProjectType] ADD CONSTRAINT [SubjectProjectType_SubjectId_fkey] FOREIGN KEY ([SubjectId]) REFERENCES [dbo].[Subject]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubmissionArtifact] ADD CONSTRAINT [SubmissionArtifact_SubmissionId_fkey] FOREIGN KEY ([SubmissionId]) REFERENCES [dbo].[Submission]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TestCase] ADD CONSTRAINT [TestCase_ExamId_fkey] FOREIGN KEY ([ExamId]) REFERENCES [dbo].[Exam]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_RoleId_fkey] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Role]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
