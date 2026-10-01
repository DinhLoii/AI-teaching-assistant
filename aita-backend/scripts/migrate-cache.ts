/**
 * One-time migration script: transfers grading reports from the local
 * JSON cache file (temp/submissions_db.json) into the SQL Server database.
 *
 * Usage:  npx tsx scripts/migrate-cache.ts
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CachedSubmission {
  id: string;
  assignmentId?: string;
  studentId?: string;
  score: number;
  maxScore: number;
  assessedAt: string;
  title?: string;
  report: any;
}

async function main() {
  const cacheFile = path.join(process.cwd(), 'temp', 'submissions_db.json');

  let raw: string;
  try {
    raw = await fs.readFile(cacheFile, 'utf-8');
  } catch {
    console.log('[migrate-cache] No cache file found at', cacheFile, '— nothing to migrate.');
    return;
  }

  let items: CachedSubmission[];
  try {
    items = JSON.parse(raw);
  } catch {
    console.error('[migrate-cache] Cache file is corrupted. Aborting.');
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log('[migrate-cache] Cache file is empty — nothing to migrate.');
    return;
  }

  console.log(`[migrate-cache] Found ${items.length} cached submission(s). Starting migration…`);

  let successCount = 0;
  let skipCount = 0;
  let createCount = 0;

  for (const sub of items) {
    const reportJson = JSON.stringify(sub.report);

    try {
      const existing = await prisma.submission.findUnique({ where: { Id: sub.id } });

      if (existing) {
        // Row exists — update it with the report
        await prisma.submission.update({
          where: { Id: sub.id },
          data: {
            GradingStatus: 'GRADED',
            FinalScore: sub.score,
            TotalScore: sub.maxScore,
            GradedAt: new Date(sub.assessedAt),
            ReportData: reportJson,
          },
        });
        successCount++;
        console.log(`  ✅ Updated: ${sub.id} (score ${sub.score}/${sub.maxScore})`);
      } else {
        // Row doesn't exist (batch-generated UUID) — create it
        await prisma.submission.create({
          data: {
            Id: sub.id,
            GradingStatus: 'GRADED',
            FinalScore: sub.score,
            TotalScore: sub.maxScore,
            GradedAt: new Date(sub.assessedAt),
            ReportData: reportJson,
            SubmittedAt: new Date(sub.assessedAt),
          },
        });
        createCount++;
        console.log(`  🆕 Created: ${sub.id} (score ${sub.score}/${sub.maxScore})`);
      }
    } catch (err: any) {
      skipCount++;
      console.error(`  ❌ Failed: ${sub.id} — ${err.message}`);
    }
  }

  console.log(`\n[migrate-cache] Migration complete.`);
  console.log(`  Updated: ${successCount}`);
  console.log(`  Created: ${createCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Total:   ${items.length}`);

  // Rename cache file to .bak so it won't be re-migrated
  try {
    await fs.rename(cacheFile, cacheFile + '.bak');
    console.log(`\n[migrate-cache] Cache file renamed to submissions_db.json.bak`);
  } catch {}
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
