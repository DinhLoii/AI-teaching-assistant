-- DropForeignKey
ALTER TABLE "SubmissionGradingTask" DROP CONSTRAINT "SubmissionGradingTask_SubmissionId_fkey";

-- DropIndex
DROP INDEX "RubricEmbedding_Embedding_hnsw_idx";

-- AddForeignKey
ALTER TABLE "SubmissionGradingTask" ADD CONSTRAINT "SubmissionGradingTask_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
