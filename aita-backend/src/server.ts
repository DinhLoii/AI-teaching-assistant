import http from 'http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { seedTestAccounts } from './database/dev-seed.js'
import { syncClassSemesters } from './database/sync-class-semesters.js'
import { initNotificationWebSocket } from './shared/infrastructure/websocket/notification-ws.service.js'

const app = createApp()
const server = http.createServer(app)

// Attach WebSocket server for real-time notifications
initNotificationWebSocket(server)

if (env.NODE_ENV === 'development') {
  // DB down must not block boot — the error surfaces on the first real query anyway
  seedTestAccounts()
    .then(() => console.log('🌱 Dev seed: test accounts ready (admin/lecturer/student @fpt.edu.vn)'))
    .catch((err) => console.warn('⚠️ Dev seed skipped:', err instanceof Error ? err.message : err))
} else {
  // In production, always ensure subject semester alignments are synced
  syncClassSemesters()
    .then(() => console.log('✅ Subject semesters synchronized successfully.'))
    .catch((err) => console.warn('⚠️ Subject semester sync skipped:', err instanceof Error ? err.message : err))
}

// Start HTTP + WebSocket server
server.listen(env.PORT, () => {
  console.log(`\n🎓 AITA Backend — http://localhost:${env.PORT}`)
  console.log(`   API base:   http://localhost:${env.PORT}/api`)
  console.log(`   WS Stream:  ws://localhost:${env.PORT}/ws/notifications`)
  console.log(`   Health:     GET /api/health`)
  console.log(`   CORS:       ${env.CORS_ORIGIN}\n`)
})
