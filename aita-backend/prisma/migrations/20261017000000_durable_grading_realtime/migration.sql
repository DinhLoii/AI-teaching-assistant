BEGIN;
CREATE TABLE IF NOT EXISTS "SubmissionGradingTask" (
  "SubmissionId" TEXT PRIMARY KEY REFERENCES "Submission"("Id") ON DELETE CASCADE,
  "Status" TEXT NOT NULL DEFAULT 'pending',
  "Lane" TEXT NOT NULL DEFAULT 'continuous',
  "Attempts" INTEGER NOT NULL DEFAULT 0,
  "RequestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "AvailableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "LeaseOwner" TEXT,
  "LeaseUntil" TIMESTAMPTZ(3),
  "LastError" TEXT
);
CREATE INDEX IF NOT EXISTS "SubmissionGradingTask_Status_AvailableAt_idx" ON "SubmissionGradingTask"("Status", "AvailableAt");
CREATE TABLE IF NOT EXISTS "RealtimeEvent" (
  "Id" TEXT PRIMARY KEY,
  "Sender" TEXT NOT NULL,
  "Topic" TEXT NOT NULL,
  "Payload" TEXT NOT NULL,
  "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RealtimeEvent_CreatedAt_idx" ON "RealtimeEvent"("CreatedAt");
ALTER TABLE "SubmissionGradingTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RealtimeEvent" ENABLE ROW LEVEL SECURITY;
COMMIT;
