CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- CreateTable
CREATE TABLE "User" (
    "Id" TEXT NOT NULL,
    "Email" TEXT,
    "PasswordHash" TEXT,
    "FullName" TEXT,
    "StudentCode" TEXT,
    "LecturerCode" TEXT,
    "Phone" TEXT,
    "Avatar" TEXT,
    "Status" TEXT,
    "Campus" TEXT DEFAULT 'quynhon',
    "LastLoginAt" TIMESTAMP(3),
    "RequirePasswordChange" BOOLEAN DEFAULT false,
    "ResetPasswordOtp" TEXT,
    "ResetPasswordOtpExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Class" (
    "Id" TEXT NOT NULL,
    "ClassCode" TEXT,
    "SubjectId" TEXT,
    "SemesterId" TEXT,
    "Status" TEXT,
    "Note" TEXT,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "StudentId" TEXT,
    "ClassId" TEXT,
    "AttemptNumber" INTEGER,
    "IsLatest" BOOLEAN,
    "SubmittedAt" TIMESTAMP(3),
    "ZipFileUrl" TEXT,
    "GradingStatus" TEXT,
    "ReviewStatus" TEXT,
    "TotalScore" DECIMAL(18,2),
    "RawScore" DECIMAL(18,2),
    "LatePenaltyAmount" DECIMAL(18,2),
    "FinalScore" DECIMAL(18,2),
    "IsReopened" BOOLEAN DEFAULT false,
    "ReopenReason" TEXT,
    "InstructorFeedback" TEXT,
    "StudentFeedback" TEXT,
    "ReviewedBy" TEXT,
    "ReviewedAt" TIMESTAMP(3),
    "GradedAt" TIMESTAMP(3),
    "ReportData" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SubmissionGradingTask" (
    "SubmissionId" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "Lane" TEXT NOT NULL DEFAULT 'continuous',
    "Attempts" INTEGER NOT NULL DEFAULT 0,
    "RequestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "AvailableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LeaseOwner" TEXT,
    "LeaseUntil" TIMESTAMPTZ(3),
    "LastError" TEXT,

    CONSTRAINT "SubmissionGradingTask_pkey" PRIMARY KEY ("SubmissionId")
);

-- CreateTable
CREATE TABLE "RealtimeEvent" (
    "Id" TEXT NOT NULL,
    "Sender" TEXT NOT NULL,
    "Topic" TEXT NOT NULL,
    "Payload" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "Id" TEXT NOT NULL,
    "SubjectCode" TEXT,
    "SubjectName" TEXT,
    "Description" TEXT,
    "IsActive" BOOLEAN,
    "Semester" INTEGER,
    "Credit" INTEGER,
    "SyllabusData" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "Id" TEXT NOT NULL,
    "Title" TEXT,
    "Message" TEXT,
    "Type" TEXT,
    "ReferenceId" TEXT,
    "ReferenceType" TEXT,
    "CreatedBy" TEXT,
    "CreatedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AiApiKey" (
    "Id" TEXT NOT NULL,
    "Provider" TEXT,
    "KeyValue" TEXT,
    "Label" TEXT,
    "IsActive" BOOLEAN,
    "IsExhausted" BOOLEAN,
    "LastUsedAt" TIMESTAMP(3),
    "TotalUsageCount" INTEGER,

    CONSTRAINT "AiApiKey_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT,
    "ExamId" TEXT,
    "SubmissionId" TEXT,
    "RequestId" TEXT,
    "Provider" TEXT,
    "ActionType" TEXT,
    "ModelUsed" TEXT,
    "PromptTokens" INTEGER,
    "CompletionTokens" INTEGER,
    "CostEstimate" DECIMAL(18,2),
    "DurationMs" INTEGER,
    "IsSuccess" BOOLEAN,
    "ErrorMessage" TEXT,
    "CreatedAt" TIMESTAMP(3),

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AssignmentTemplate" (
    "Id" TEXT NOT NULL,
    "SubjectId" TEXT,
    "Name" TEXT,
    "Description" TEXT,
    "AssignmentType" TEXT,
    "DefaultGradingProfileId" TEXT,
    "DefaultProjectTypeId" TEXT,
    "SortOrder" INTEGER,
    "IsActive" BOOLEAN,

    CONSTRAINT "AssignmentTemplate_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "Id" TEXT NOT NULL,
    "EntityName" TEXT,
    "EntityId" TEXT,
    "Action" TEXT,
    "OldValue" TEXT,
    "NewValue" TEXT,
    "UserId" TEXT,
    "IpAddress" TEXT,
    "CreatedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BuildArtifact" (
    "Id" TEXT NOT NULL,
    "GradingSessionId" TEXT,
    "BuildStatus" TEXT,
    "BuildLog" TEXT,
    "DockerImageId" TEXT,
    "ExecutablePath" TEXT,
    "BuildHash" TEXT,
    "DurationMs" INTEGER,

    CONSTRAINT "BuildArtifact_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "CriterionScore" (
    "Id" TEXT NOT NULL,
    "RuleScoreId" TEXT,
    "RubricCriterionId" TEXT,
    "AiScore" DECIMAL(18,2),
    "MaxScore" DECIMAL(18,2),
    "AiReasoning" TEXT,
    "InstructorScore" DECIMAL(18,2),
    "IsOverridden" BOOLEAN,
    "EffectiveScore" DECIMAL(18,2),

    CONSTRAINT "CriterionScore_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "Id" TEXT NOT NULL,
    "RuleScoreId" TEXT,
    "EvidenceType" TEXT,
    "Content" TEXT,
    "ImageUrl" TEXT,
    "Caption" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "Id" TEXT NOT NULL,
    "Title" TEXT,
    "Description" TEXT,
    "AssignmentTemplateId" TEXT,
    "ProjectTypeId" TEXT,
    "GradingProfileId" TEXT,
    "SubjectId" TEXT,
    "ExamType" TEXT,
    "Duration" INTEGER,
    "StartDate" TIMESTAMP(3),
    "DueDate" TIMESTAMP(3),
    "TotalPoints" DECIMAL(18,2),
    "WeightPercentage" DECIMAL(5,2),
    "Status" TEXT,
    "GradingStrategy" TEXT DEFAULT 'CONTINUOUS_QUEUE',
    "SubmissionFormat" TEXT,
    "AiGeneratedContent" TEXT,
    "OriginalPrompt" TEXT,
    "PromptTemplateId" TEXT,
    "CreatedBy" TEXT,
    "LatePenaltyType" TEXT DEFAULT 'NONE',
    "LatePenaltyValue" DECIMAL(18,2),
    "MaxLatePenalty" DECIMAL(18,2),
    "AllowLateSubmission" BOOLEAN DEFAULT true,
    "IsDeleted" BOOLEAN DEFAULT false,
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ExamAttachment" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "FileName" TEXT,
    "FileUrl" TEXT,
    "FileType" TEXT,

    CONSTRAINT "ExamAttachment_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ExamGenerationHistory" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "Version" INTEGER,
    "Prompt" TEXT,
    "GeneratedContent" TEXT,
    "GeneratedBy" TEXT,

    CONSTRAINT "ExamGenerationHistory_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ExamSection" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "SectionCode" TEXT,
    "Title" TEXT,
    "Description" TEXT,
    "MaxPoints" DECIMAL(18,2),
    "SortOrder" INTEGER,

    CONSTRAINT "ExamSection_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ExecutionResult" (
    "Id" TEXT NOT NULL,
    "GradingJobId" TEXT,
    "SubmissionId" TEXT,
    "EngineType" TEXT,
    "ExecutionLabel" TEXT,
    "RawOutput" TEXT,
    "Score" DECIMAL(18,2),
    "Status" TEXT,
    "StartedAt" TIMESTAMP(3),
    "CompletedAt" TIMESTAMP(3),
    "DurationMs" INTEGER,

    CONSTRAINT "ExecutionResult_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "GradingJob" (
    "Id" TEXT NOT NULL,
    "GradingSessionId" TEXT,
    "GradingProfileStepId" TEXT,
    "Engine" TEXT,
    "Priority" INTEGER,
    "Status" TEXT,
    "TriggeredAt" TIMESTAMP(3),
    "CompletedAt" TIMESTAMP(3),
    "WorkerNodeId" TEXT,

    CONSTRAINT "GradingJob_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "GradingProfile" (
    "Id" TEXT NOT NULL,
    "Name" TEXT,
    "ProjectTypeId" TEXT,
    "Description" TEXT,
    "IsActive" BOOLEAN,

    CONSTRAINT "GradingProfile_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "GradingProfileStep" (
    "Id" TEXT NOT NULL,
    "GradingProfileId" TEXT,
    "EngineType" TEXT,
    "StepOrder" INTEGER,
    "ConfigJson" TEXT,
    "IsRequired" BOOLEAN,
    "TimeoutSeconds" INTEGER,

    CONSTRAINT "GradingProfileStep_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "GradingSession" (
    "Id" TEXT NOT NULL,
    "SubmissionId" TEXT,
    "Version" INTEGER,
    "TriggeredBy" TEXT,
    "TriggerReason" TEXT,
    "Status" TEXT,
    "TotalScore" DECIMAL(18,2),
    "StartedAt" TIMESTAMP(3),
    "CompletedAt" TIMESTAMP(3),

    CONSTRAINT "GradingSession_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "Id" TEXT NOT NULL,
    "FileName" TEXT,
    "FileUrl" TEXT,
    "Status" TEXT,
    "TotalRows" INTEGER,
    "SuccessCount" INTEGER,
    "ErrorCount" INTEGER,
    "ErrorDetails" TEXT,
    "ImportedBy" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "InstructorClass" (
    "UserId" TEXT NOT NULL,
    "ClassId" TEXT NOT NULL,
    "EnrolledAt" TIMESTAMP(3),

    CONSTRAINT "InstructorClass_pkey" PRIMARY KEY ("UserId","ClassId")
);

-- CreateTable
CREATE TABLE "JobDependency" (
    "JobId" TEXT NOT NULL,
    "DependsOnJobId" TEXT NOT NULL,
    "DependencyType" TEXT,

    CONSTRAINT "JobDependency_pkey" PRIMARY KEY ("JobId","DependsOnJobId")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "Id" TEXT NOT NULL,
    "NotificationId" TEXT,
    "UserId" TEXT,
    "IsRead" BOOLEAN,
    "ReadAt" TIMESTAMP(3),

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ProjectType" (
    "Id" TEXT NOT NULL,
    "Code" TEXT,
    "DisplayName" TEXT,
    "RequiresSandbox" BOOLEAN,
    "SandboxImage" TEXT,
    "BuildCommand" TEXT,
    "RunCommand" TEXT,

    CONSTRAINT "ProjectType_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ProjectTypeComposition" (
    "ParentProjectTypeId" TEXT NOT NULL,
    "ChildProjectTypeId" TEXT NOT NULL,
    "Role" TEXT,
    "IsRequired" BOOLEAN,
    "SortOrder" INTEGER,

    CONSTRAINT "ProjectTypeComposition_pkey" PRIMARY KEY ("ParentProjectTypeId","ChildProjectTypeId")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "Id" TEXT NOT NULL,
    "Name" TEXT,
    "SubjectId" TEXT,
    "ProjectTypeId" TEXT,
    "Category" TEXT,
    "TemplateContent" TEXT,
    "PlaceholderSchema" TEXT,
    "IsDefault" BOOLEAN,
    "IsActive" BOOLEAN,
    "UsageCount" INTEGER,
    "CreatedBy" TEXT,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ReferenceArtifact" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "ArtifactType" TEXT,
    "ExpectedFor" TEXT,
    "FileName" TEXT,
    "FileUrl" TEXT,
    "Description" TEXT,
    "SortOrder" INTEGER,

    CONSTRAINT "ReferenceArtifact_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT,
    "Token" TEXT,
    "ExpiresAt" TIMESTAMP(3),
    "IsRevoked" BOOLEAN,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "OAuthIdentity" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT,
    "Provider" TEXT,
    "ProviderId" TEXT,
    "AccessToken" TEXT,
    "RefreshToken" TEXT,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Role" (
    "Id" TEXT NOT NULL,
    "RoleName" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "Id" TEXT NOT NULL,
    "RubricRuleId" TEXT,
    "Description" TEXT,
    "MaxPoints" DECIMAL(18,2),
    "Weight" DECIMAL(18,2),
    "ValidationType" TEXT,
    "ValidationConfig" TEXT,
    "IsCritical" BOOLEAN,
    "SortOrder" INTEGER,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RubricRule" (
    "Id" TEXT NOT NULL,
    "SectionId" TEXT,
    "RuleCode" TEXT,
    "Description" TEXT,
    "MaxPoints" DECIMAL(18,2),
    "EvaluationPrompt" TEXT,
    "ReferenceAnswer" TEXT,
    "RequireImageEvidence" BOOLEAN,
    "RequireCodeEvidence" BOOLEAN,
    "IsManualOnly" BOOLEAN,
    "SortOrder" INTEGER,

    CONSTRAINT "RubricRule_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RuleScore" (
    "Id" TEXT NOT NULL,
    "ExecutionResultId" TEXT,
    "RubricRuleId" TEXT,
    "AiScore" DECIMAL(18,2),
    "MaxScore" DECIMAL(18,2),
    "AiReasoning" TEXT,
    "InstructorScore" DECIMAL(18,2),
    "InstructorComment" TEXT,
    "IsOverridden" BOOLEAN,
    "EffectiveScore" DECIMAL(18,2),

    CONSTRAINT "RuleScore_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SampleCode" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "Language" TEXT,
    "Code" TEXT,
    "Explanation" TEXT,

    CONSTRAINT "SampleCode_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SandboxExecution" (
    "Id" TEXT NOT NULL,
    "GradingSessionId" TEXT,
    "ContainerId" TEXT,
    "SandboxImage" TEXT,
    "Status" TEXT,
    "ExitCode" INTEGER,
    "CpuTimeMs" BIGINT,
    "PeakMemoryKb" BIGINT,
    "NetworkDisabled" BOOLEAN,
    "StartedAt" TIMESTAMP(3),
    "FinishedAt" TIMESTAMP(3),
    "RunLog" TEXT,

    CONSTRAINT "SandboxExecution_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "Id" TEXT NOT NULL,
    "Season" TEXT,
    "Code" TEXT,
    "StartDate" TIMESTAMP(3),
    "EndDate" TIMESTAMP(3),
    "IsActive" BOOLEAN,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SemesterSubject" (
    "SemesterId" TEXT NOT NULL,
    "SubjectId" TEXT NOT NULL,
    "AssignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SemesterSubject_pkey" PRIMARY KEY ("SemesterId","SubjectId")
);

-- CreateTable
CREATE TABLE "StudentClass" (
    "UserId" TEXT NOT NULL,
    "ClassId" TEXT NOT NULL,
    "EnrolledAt" TIMESTAMP(3),

    CONSTRAINT "StudentClass_pkey" PRIMARY KEY ("UserId","ClassId")
);

-- CreateTable
CREATE TABLE "SubjectProjectType" (
    "SubjectId" TEXT NOT NULL,
    "ProjectTypeId" TEXT NOT NULL,

    CONSTRAINT "SubjectProjectType_pkey" PRIMARY KEY ("SubjectId","ProjectTypeId")
);

-- CreateTable
CREATE TABLE "SubmissionArtifact" (
    "Id" TEXT NOT NULL,
    "SubmissionId" TEXT,
    "ArtifactType" TEXT,
    "ArtifactLabel" TEXT,
    "FileName" TEXT,
    "FileUrl" TEXT,
    "FileSizeBytes" BIGINT,
    "HashSha256" TEXT,
    "ExtractedPath" TEXT,
    "MimeType" TEXT,

    CONSTRAINT "SubmissionArtifact_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "Key" TEXT NOT NULL,
    "Value" TEXT,
    "Description" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("Key")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "Input" TEXT,
    "ExpectedOutput" TEXT,
    "IsHidden" BOOLEAN,
    "TimeoutMs" INTEGER,
    "MemoryLimitMb" INTEGER,
    "Points" DECIMAL(18,2),
    "SortOrder" INTEGER,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "UserId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    "AssignedAt" TIMESTAMP(3),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("UserId","RoleId")
);

-- CreateTable
CREATE TABLE "ExamClass" (
    "ExamId" TEXT NOT NULL,
    "ClassId" TEXT NOT NULL,
    "AssignedAt" TIMESTAMP(3),
    "DueDate" TIMESTAMP(3),

    CONSTRAINT "ExamClass_pkey" PRIMARY KEY ("ExamId","ClassId")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "Id" TEXT NOT NULL,
    "SubmissionId" TEXT,
    "StudentId" TEXT,
    "Reason" TEXT,
    "Status" TEXT,
    "CreatedAt" TIMESTAMP(3),
    "ResolvedAt" TIMESTAMP(3),
    "Resolution" TEXT,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PendingEnrollment" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "SemesterCode" TEXT,
    "Season" TEXT,
    "ClassCode" TEXT,
    "SubjectCode" TEXT,
    "Status" TEXT DEFAULT 'Pending',
    "CreatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "PendingEnrollment_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PublishedAssignment" (
    "Id" TEXT NOT NULL,
    "Version" TEXT,
    "Title" TEXT,
    "Description" TEXT,
    "ProjectType" TEXT,
    "BlueprintId" TEXT,
    "Data" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "IsDeleted" BOOLEAN DEFAULT false,
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "PublishedAssignment_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "SubmissionOverride" (
    "Id" TEXT NOT NULL,
    "ExamId" TEXT,
    "StudentId" TEXT,
    "ClassId" TEXT,
    "ExtendedDueDate" TIMESTAMP(3),
    "PenaltyMode" TEXT DEFAULT 'SYSTEM_DEFAULT',
    "CustomPenaltyRate" DECIMAL(18,2),
    "FlatPenaltyAmount" DECIMAL(18,2),
    "ScoreCap" DECIMAL(18,2),
    "Reason" TEXT,
    "CreatedBy" TEXT,
    "CreatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionOverride_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Note" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT,
    "DateStr" TEXT NOT NULL,
    "TimeStr" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "Id" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Description" TEXT,
    "ExamId" TEXT,
    "SubjectCode" TEXT,
    "Language" TEXT,
    "Category" TEXT DEFAULT 'standard',
    "SourceType" TEXT NOT NULL DEFAULT 'EXTRACTED_ORIGINAL',
    "Status" TEXT NOT NULL DEFAULT 'DRAFT',
    "Version" INTEGER NOT NULL DEFAULT 1,
    "TotalPoints" DECIMAL(18,2) NOT NULL DEFAULT 10,
    "RawEvidence" TEXT,
    "DocumentHash" TEXT,
    "DocumentName" TEXT,
    "DocumentUrl" TEXT,
    "CreatedBy" TEXT,
    "ApprovedBy" TEXT,
    "ApprovedAt" TIMESTAMP(3),
    "MetadataJson" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RubricItem" (
    "Id" TEXT NOT NULL,
    "RubricId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "MaxPoints" DECIMAL(18,2) NOT NULL DEFAULT 2,
    "Weight" DECIMAL(18,2) DEFAULT 1,
    "Method" TEXT NOT NULL DEFAULT 'ai_assessment',
    "PassCondition" TEXT,
    "FailCondition" TEXT,
    "LevelsJson" TEXT,
    "EvidenceSource" TEXT,
    "SortOrder" INTEGER NOT NULL DEFAULT 1,
    "ReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricItem_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RubricEmbedding" (
    "Id" TEXT NOT NULL,
    "RubricId" TEXT,
    "RubricItemId" TEXT,
    "ExamId" TEXT,
    "ContentType" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "Embedding" public.vector(768),
    "ModelName" TEXT NOT NULL DEFAULT 'text-embedding-004',
    "Dimensions" INTEGER NOT NULL DEFAULT 768,
    "Language" TEXT,
    "SubjectCode" TEXT,
    "Category" TEXT,
    "MetadataJson" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricEmbedding_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- CreateIndex
CREATE INDEX "User_StudentCode_idx" ON "User"("StudentCode");

-- CreateIndex
CREATE INDEX "User_LecturerCode_idx" ON "User"("LecturerCode");

-- CreateIndex
CREATE INDEX "Class_SubjectId_idx" ON "Class"("SubjectId");

-- CreateIndex
CREATE INDEX "Class_SemesterId_idx" ON "Class"("SemesterId");

-- CreateIndex
CREATE INDEX "Class_Status_idx" ON "Class"("Status");

-- CreateIndex
CREATE UNIQUE INDEX "Class_ClassCode_SubjectId_SemesterId_key" ON "Class"("ClassCode", "SubjectId", "SemesterId");

-- CreateIndex
CREATE INDEX "Submission_StudentId_idx" ON "Submission"("StudentId");

-- CreateIndex
CREATE INDEX "Submission_ClassId_idx" ON "Submission"("ClassId");

-- CreateIndex
CREATE INDEX "Submission_ExamId_idx" ON "Submission"("ExamId");

-- CreateIndex
CREATE INDEX "Submission_SubmittedAt_idx" ON "Submission"("SubmittedAt");

-- CreateIndex
CREATE INDEX "Submission_GradingStatus_idx" ON "Submission"("GradingStatus");

-- CreateIndex
CREATE INDEX "Submission_ReviewStatus_idx" ON "Submission"("ReviewStatus");

-- CreateIndex
CREATE INDEX "Submission_StudentId_ReviewStatus_idx" ON "Submission"("StudentId", "ReviewStatus");

-- CreateIndex
CREATE INDEX "Submission_ClassId_ReviewStatus_idx" ON "Submission"("ClassId", "ReviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_StudentId_ExamId_ClassId_AttemptNumber_idx" ON "Submission"("StudentId", "ExamId", "ClassId", "AttemptNumber");

-- CreateIndex
CREATE INDEX "SubmissionGradingTask_Status_AvailableAt_idx" ON "SubmissionGradingTask"("Status", "AvailableAt");

-- CreateIndex
CREATE INDEX "RealtimeEvent_CreatedAt_idx" ON "RealtimeEvent"("CreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_SubjectCode_key" ON "Subject"("SubjectCode");

-- CreateIndex
CREATE INDEX "AuditLog_UserId_idx" ON "AuditLog"("UserId");

-- CreateIndex
CREATE INDEX "AuditLog_CreatedAt_idx" ON "AuditLog"("CreatedAt");

-- CreateIndex
CREATE INDEX "AuditLog_Action_idx" ON "AuditLog"("Action");

-- CreateIndex
CREATE INDEX "CriterionScore_RuleScoreId_idx" ON "CriterionScore"("RuleScoreId");

-- CreateIndex
CREATE INDEX "Exam_SubjectId_idx" ON "Exam"("SubjectId");

-- CreateIndex
CREATE INDEX "Exam_CreatedBy_idx" ON "Exam"("CreatedBy");

-- CreateIndex
CREATE INDEX "Exam_Status_idx" ON "Exam"("Status");

-- CreateIndex
CREATE INDEX "Exam_DueDate_idx" ON "Exam"("DueDate");

-- CreateIndex
CREATE INDEX "ExecutionResult_SubmissionId_idx" ON "ExecutionResult"("SubmissionId");

-- CreateIndex
CREATE INDEX "ExecutionResult_GradingJobId_idx" ON "ExecutionResult"("GradingJobId");

-- CreateIndex
CREATE INDEX "GradingJob_GradingSessionId_idx" ON "GradingJob"("GradingSessionId");

-- CreateIndex
CREATE INDEX "GradingSession_SubmissionId_idx" ON "GradingSession"("SubmissionId");

-- CreateIndex
CREATE INDEX "InstructorClass_ClassId_idx" ON "InstructorClass"("ClassId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_UserId_IsRead_idx" ON "NotificationRecipient"("UserId", "IsRead");

-- CreateIndex
CREATE INDEX "NotificationRecipient_NotificationId_idx" ON "NotificationRecipient"("NotificationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectType_Code_key" ON "ProjectType"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthIdentity_Provider_ProviderId_key" ON "OAuthIdentity"("Provider", "ProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_RoleName_key" ON "Role"("RoleName");

-- CreateIndex
CREATE INDEX "RuleScore_ExecutionResultId_idx" ON "RuleScore"("ExecutionResultId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_Season_Code_key" ON "Semester"("Season", "Code");

-- CreateIndex
CREATE INDEX "StudentClass_ClassId_idx" ON "StudentClass"("ClassId");

-- CreateIndex
CREATE INDEX "SubmissionArtifact_SubmissionId_idx" ON "SubmissionArtifact"("SubmissionId");

-- CreateIndex
CREATE INDEX "TestCase_ExamId_idx" ON "TestCase"("ExamId");

-- CreateIndex
CREATE INDEX "ExamClass_ClassId_idx" ON "ExamClass"("ClassId");

-- CreateIndex
CREATE INDEX "Appeal_SubmissionId_idx" ON "Appeal"("SubmissionId");

-- CreateIndex
CREATE INDEX "Appeal_StudentId_idx" ON "Appeal"("StudentId");

-- CreateIndex
CREATE INDEX "PublishedAssignment_IsDeleted_idx" ON "PublishedAssignment"("IsDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionOverride_ExamId_StudentId_idx" ON "SubmissionOverride"("ExamId", "StudentId");

-- CreateIndex
CREATE INDEX "Rubric_ExamId_idx" ON "Rubric"("ExamId");

-- CreateIndex
CREATE INDEX "Rubric_SubjectCode_idx" ON "Rubric"("SubjectCode");

-- CreateIndex
CREATE INDEX "Rubric_Language_idx" ON "Rubric"("Language");

-- CreateIndex
CREATE INDEX "Rubric_Status_idx" ON "Rubric"("Status");

-- CreateIndex
CREATE INDEX "Rubric_CreatedBy_idx" ON "Rubric"("CreatedBy");

-- CreateIndex
CREATE INDEX "Rubric_DocumentHash_idx" ON "Rubric"("DocumentHash");

-- CreateIndex
CREATE INDEX "RubricItem_RubricId_idx" ON "RubricItem"("RubricId");

-- CreateIndex
CREATE INDEX "RubricItem_SortOrder_idx" ON "RubricItem"("SortOrder");

-- CreateIndex
CREATE INDEX "RubricEmbedding_RubricId_idx" ON "RubricEmbedding"("RubricId");

-- CreateIndex
CREATE INDEX "RubricEmbedding_RubricItemId_idx" ON "RubricEmbedding"("RubricItemId");

-- CreateIndex
CREATE INDEX "RubricEmbedding_ExamId_idx" ON "RubricEmbedding"("ExamId");

-- CreateIndex
CREATE INDEX "RubricEmbedding_SubjectCode_idx" ON "RubricEmbedding"("SubjectCode");

-- CreateIndex
CREATE INDEX "RubricEmbedding_ContentType_idx" ON "RubricEmbedding"("ContentType");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_SemesterId_fkey" FOREIGN KEY ("SemesterId") REFERENCES "Semester"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ClassId_fkey" FOREIGN KEY ("ClassId") REFERENCES "Class"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ReviewedBy_fkey" FOREIGN KEY ("ReviewedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_StudentId_fkey" FOREIGN KEY ("StudentId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionGradingTask" ADD CONSTRAINT "SubmissionGradingTask_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssignmentTemplate" ADD CONSTRAINT "AssignmentTemplate_DefaultGradingProfileId_fkey" FOREIGN KEY ("DefaultGradingProfileId") REFERENCES "GradingProfile"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssignmentTemplate" ADD CONSTRAINT "AssignmentTemplate_DefaultProjectTypeId_fkey" FOREIGN KEY ("DefaultProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssignmentTemplate" ADD CONSTRAINT "AssignmentTemplate_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BuildArtifact" ADD CONSTRAINT "BuildArtifact_GradingSessionId_fkey" FOREIGN KEY ("GradingSessionId") REFERENCES "GradingSession"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_RubricCriterionId_fkey" FOREIGN KEY ("RubricCriterionId") REFERENCES "RubricCriterion"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_RuleScoreId_fkey" FOREIGN KEY ("RuleScoreId") REFERENCES "RuleScore"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_RuleScoreId_fkey" FOREIGN KEY ("RuleScoreId") REFERENCES "RuleScore"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_AssignmentTemplateId_fkey" FOREIGN KEY ("AssignmentTemplateId") REFERENCES "AssignmentTemplate"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_GradingProfileId_fkey" FOREIGN KEY ("GradingProfileId") REFERENCES "GradingProfile"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_ProjectTypeId_fkey" FOREIGN KEY ("ProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_PromptTemplateId_fkey" FOREIGN KEY ("PromptTemplateId") REFERENCES "PromptTemplate"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamAttachment" ADD CONSTRAINT "ExamAttachment_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamGenerationHistory" ADD CONSTRAINT "ExamGenerationHistory_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamGenerationHistory" ADD CONSTRAINT "ExamGenerationHistory_GeneratedBy_fkey" FOREIGN KEY ("GeneratedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamSection" ADD CONSTRAINT "ExamSection_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExecutionResult" ADD CONSTRAINT "ExecutionResult_GradingJobId_fkey" FOREIGN KEY ("GradingJobId") REFERENCES "GradingJob"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExecutionResult" ADD CONSTRAINT "ExecutionResult_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingJob" ADD CONSTRAINT "GradingJob_GradingProfileStepId_fkey" FOREIGN KEY ("GradingProfileStepId") REFERENCES "GradingProfileStep"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingJob" ADD CONSTRAINT "GradingJob_GradingSessionId_fkey" FOREIGN KEY ("GradingSessionId") REFERENCES "GradingSession"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingProfile" ADD CONSTRAINT "GradingProfile_ProjectTypeId_fkey" FOREIGN KEY ("ProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingProfileStep" ADD CONSTRAINT "GradingProfileStep_GradingProfileId_fkey" FOREIGN KEY ("GradingProfileId") REFERENCES "GradingProfile"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingSession" ADD CONSTRAINT "GradingSession_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GradingSession" ADD CONSTRAINT "GradingSession_TriggeredBy_fkey" FOREIGN KEY ("TriggeredBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_ImportedBy_fkey" FOREIGN KEY ("ImportedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InstructorClass" ADD CONSTRAINT "InstructorClass_ClassId_fkey" FOREIGN KEY ("ClassId") REFERENCES "Class"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InstructorClass" ADD CONSTRAINT "InstructorClass_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_DependsOnJobId_fkey" FOREIGN KEY ("DependsOnJobId") REFERENCES "GradingJob"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_JobId_fkey" FOREIGN KEY ("JobId") REFERENCES "GradingJob"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_NotificationId_fkey" FOREIGN KEY ("NotificationId") REFERENCES "Notification"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProjectTypeComposition" ADD CONSTRAINT "ProjectTypeComposition_ChildProjectTypeId_fkey" FOREIGN KEY ("ChildProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProjectTypeComposition" ADD CONSTRAINT "ProjectTypeComposition_ParentProjectTypeId_fkey" FOREIGN KEY ("ParentProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_ProjectTypeId_fkey" FOREIGN KEY ("ProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReferenceArtifact" ADD CONSTRAINT "ReferenceArtifact_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_RubricRuleId_fkey" FOREIGN KEY ("RubricRuleId") REFERENCES "RubricRule"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RubricRule" ADD CONSTRAINT "RubricRule_SectionId_fkey" FOREIGN KEY ("SectionId") REFERENCES "ExamSection"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RuleScore" ADD CONSTRAINT "RuleScore_ExecutionResultId_fkey" FOREIGN KEY ("ExecutionResultId") REFERENCES "ExecutionResult"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RuleScore" ADD CONSTRAINT "RuleScore_RubricRuleId_fkey" FOREIGN KEY ("RubricRuleId") REFERENCES "RubricRule"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SampleCode" ADD CONSTRAINT "SampleCode_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SandboxExecution" ADD CONSTRAINT "SandboxExecution_GradingSessionId_fkey" FOREIGN KEY ("GradingSessionId") REFERENCES "GradingSession"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SemesterSubject" ADD CONSTRAINT "SemesterSubject_SemesterId_fkey" FOREIGN KEY ("SemesterId") REFERENCES "Semester"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SemesterSubject" ADD CONSTRAINT "SemesterSubject_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_ClassId_fkey" FOREIGN KEY ("ClassId") REFERENCES "Class"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubjectProjectType" ADD CONSTRAINT "SubjectProjectType_ProjectTypeId_fkey" FOREIGN KEY ("ProjectTypeId") REFERENCES "ProjectType"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubjectProjectType" ADD CONSTRAINT "SubjectProjectType_SubjectId_fkey" FOREIGN KEY ("SubjectId") REFERENCES "Subject"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionArtifact" ADD CONSTRAINT "SubmissionArtifact_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES "Role"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_ClassId_fkey" FOREIGN KEY ("ClassId") REFERENCES "Class"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_StudentId_fkey" FOREIGN KEY ("StudentId") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PendingEnrollment" ADD CONSTRAINT "PendingEnrollment_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionOverride" ADD CONSTRAINT "SubmissionOverride_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionOverride" ADD CONSTRAINT "SubmissionOverride_StudentId_fkey" FOREIGN KEY ("StudentId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionOverride" ADD CONSTRAINT "SubmissionOverride_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_ApprovedBy_fkey" FOREIGN KEY ("ApprovedBy") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricItem" ADD CONSTRAINT "RubricItem_RubricId_fkey" FOREIGN KEY ("RubricId") REFERENCES "Rubric"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricEmbedding" ADD CONSTRAINT "RubricEmbedding_RubricId_fkey" FOREIGN KEY ("RubricId") REFERENCES "Rubric"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricEmbedding" ADD CONSTRAINT "RubricEmbedding_RubricItemId_fkey" FOREIGN KEY ("RubricItemId") REFERENCES "RubricItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
