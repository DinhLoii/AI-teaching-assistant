import { prisma } from '../src/database/prisma.js'

async function setupTables() {
  try {
    console.log('1. Ensuring vector extension...')
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`)

    console.log('2. Creating Rubric table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Rubric" (
        "Id" TEXT NOT NULL PRIMARY KEY,
        "Title" TEXT NOT NULL,
        "Description" TEXT,
        "ExamId" TEXT,
        "SubjectCode" TEXT,
        "Language" TEXT,
        "Category" TEXT DEFAULT 'standard',
        "SourceType" TEXT DEFAULT 'EXTRACTED_ORIGINAL',
        "Status" TEXT DEFAULT 'DRAFT',
        "Version" INTEGER DEFAULT 1,
        "TotalPoints" DECIMAL(18, 2) DEFAULT 10,
        "RawEvidence" TEXT,
        "DocumentHash" TEXT,
        "DocumentName" TEXT,
        "DocumentUrl" TEXT,
        "CreatedBy" TEXT,
        "ApprovedBy" TEXT,
        "ApprovedAt" TIMESTAMP(3),
        "MetadataJson" TEXT,
        "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Rubric_ExamId_fkey" FOREIGN KEY ("ExamId") REFERENCES "Exam"("Id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Rubric_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Rubric_ApprovedBy_fkey" FOREIGN KEY ("ApprovedBy") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)

    console.log('3. Creating Rubric indexes...')
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rubric_ExamId_idx" ON "Rubric"("ExamId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rubric_SubjectCode_idx" ON "Rubric"("SubjectCode");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rubric_Status_idx" ON "Rubric"("Status");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rubric_DocumentHash_idx" ON "Rubric"("DocumentHash");`)

    console.log('4. Creating RubricItem table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RubricItem" (
        "Id" TEXT NOT NULL PRIMARY KEY,
        "RubricId" TEXT NOT NULL,
        "Name" TEXT NOT NULL,
        "Description" TEXT NOT NULL,
        "MaxPoints" DECIMAL(18, 2) NOT NULL DEFAULT 2,
        "Weight" DECIMAL(18, 2) DEFAULT 1,
        "Method" TEXT DEFAULT 'ai_assessment',
        "PassCondition" TEXT,
        "FailCondition" TEXT,
        "LevelsJson" TEXT,
        "EvidenceSource" TEXT,
        "SortOrder" INTEGER DEFAULT 1,
        "ReviewNeeded" BOOLEAN DEFAULT false,
        "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RubricItem_RubricId_fkey" FOREIGN KEY ("RubricId") REFERENCES "Rubric"("Id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    console.log('5. Creating RubricItem indexes...')
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricItem_RubricId_idx" ON "RubricItem"("RubricId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricItem_SortOrder_idx" ON "RubricItem"("SortOrder");`)

    console.log('6. Creating RubricEmbedding table with vector(768)...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RubricEmbedding" (
        "Id" TEXT NOT NULL PRIMARY KEY,
        "RubricId" TEXT,
        "RubricItemId" TEXT,
        "ExamId" TEXT,
        "ContentType" TEXT NOT NULL,
        "Content" TEXT NOT NULL,
        "Embedding" vector(768),
        "ModelName" TEXT DEFAULT 'text-embedding-004',
        "Dimensions" INTEGER DEFAULT 768,
        "Language" TEXT,
        "SubjectCode" TEXT,
        "Category" TEXT,
        "MetadataJson" TEXT,
        "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RubricEmbedding_RubricId_fkey" FOREIGN KEY ("RubricId") REFERENCES "Rubric"("Id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "RubricEmbedding_RubricItemId_fkey" FOREIGN KEY ("RubricItemId") REFERENCES "RubricItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    console.log('7. Creating RubricEmbedding indexes...')
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricEmbedding_RubricId_idx" ON "RubricEmbedding"("RubricId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricEmbedding_RubricItemId_idx" ON "RubricEmbedding"("RubricItemId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricEmbedding_SubjectCode_idx" ON "RubricEmbedding"("SubjectCode");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RubricEmbedding_ContentType_idx" ON "RubricEmbedding"("ContentType");`)

    console.log('8. Creating HNSW vector index on RubricEmbedding...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "RubricEmbedding_Embedding_hnsw_idx" 
      ON "RubricEmbedding" USING hnsw ("Embedding" vector_cosine_ops);
    `).catch(e => console.log('HNSW note:', e.message))

    console.log('🎉 Successfully created Rubric, RubricItem, RubricEmbedding with pgvector in Neon!')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

setupTables()
