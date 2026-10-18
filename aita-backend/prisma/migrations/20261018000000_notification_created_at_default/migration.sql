-- Preserve unknown historical dates; new notifications always have a database default.
ALTER TABLE "Notification" ALTER COLUMN "CreatedAt" SET DEFAULT CURRENT_TIMESTAMP;
