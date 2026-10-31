import http from 'http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { seedTestAccounts } from './database/dev-seed.js'
import { assertProductionPreflight } from './database/production-preflight.js'
import { initNotificationWebSocket } from './shared/infrastructure/websocket/notification-ws.service.js'
import { durableGradingQueue } from './modules/grading/engine/application/queue/durable-grading-queue.js'
import { engineSubmissionController } from './modules/grading/engine/modules/submissions/routes/index.js'
import { realtimeBus } from './shared/infrastructure/realtime-bus.js'
import { prisma } from './database/prisma.js'
import { waitForDatabase } from './database/startup.js'

try {
  await waitForDatabase(() => prisma.$connect(), message => console.warn(`[Startup] ${message}`))
  console.log('[Startup] Database connected')
} catch (error) {
  const code = (error as { code?: string; errorCode?: string })?.code || (error as { errorCode?: string })?.errorCode || 'unknown'
  console.error(`[Startup] Database connection failed (${code}). Check DATABASE_URL, network access and the database status. For Neon, set connect_timeout=20 in the connection URL.`)
  await prisma.$disconnect()
  process.exit(1)
}

if (env.NODE_ENV === 'production') {
  try { await assertProductionPreflight() }
  catch (error) {
    console.error('[Preflight]', error instanceof Error ? error.message : 'Production requirements are not satisfied')
    await prisma.$disconnect()
    process.exit(1)
  }
}

const app = createApp()
const server = http.createServer(app)

// Attach WebSocket server for real-time notifications
initNotificationWebSocket(server)
realtimeBus.start()
if (process.env.GRADING_WORKER_ENABLED !== 'false') {
  durableGradingQueue.start(id => engineSubmissionController.executeGradingForSubmission(id, null))
}

if (env.NODE_ENV === 'development' && process.env.ENABLE_DEV_SEED === 'true') {
  // Seed only after the database connection has been established.
  seedTestAccounts()
    .then(() => console.log('🌱 Dev seed: test accounts ready (admin/lecturer/student @fpt.edu.vn)'))
    .catch((err) => console.warn('⚠️ Dev seed skipped:', err instanceof Error ? err.message : err))
}

// Start HTTP + WebSocket server
server.listen(env.PORT, () => {
  console.log(`\n🎓 AITA Backend — http://localhost:${env.PORT}`)
  console.log(`   API base:   http://localhost:${env.PORT}/api`)
  console.log(`   WS Stream:  ws://localhost:${env.PORT}/ws/notifications`)
  console.log(`   Health:     GET /api/health`)
  console.log(`   CORS:       ${env.CORS_ORIGIN}\n`)
})

let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close()
  realtimeBus.stop()
  const force = setTimeout(() => process.exit(1), 25000)
  try { await durableGradingQueue.stop(); await prisma.$disconnect() }
  finally { clearTimeout(force); process.exit(0) }
}
process.once('SIGTERM', () => { void shutdown() })
process.once('SIGINT', () => { void shutdown() })
