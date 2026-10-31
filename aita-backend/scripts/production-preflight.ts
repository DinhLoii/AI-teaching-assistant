import 'dotenv/config'
import { prisma } from '../src/database/prisma.js'
import { assertProductionPreflight } from '../src/database/production-preflight.js'
try { await assertProductionPreflight(); console.log('Production preflight passed') }
catch (error) { console.error(error instanceof Error ? error.message : 'Production preflight failed'); process.exitCode = 1 }
finally { await prisma.$disconnect() }
