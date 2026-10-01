import { createApp } from './app.js'
import { env } from './config/env.js'
import { seedTestAccounts } from './database/dev-seed.js'
import { syncClassSemesters } from './database/sync-class-semesters.js'

const app = createApp()

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

// Trigger dev server restart and syncClassSemesters run
app.listen(env.PORT, () => {
  console.log(`\n🎓 AITA Backend — http://localhost:${env.PORT}`)
  console.log(`   API base:  http://localhost:${env.PORT}/api`)
  console.log(`   Health:    GET /api/health`)
  console.log(`   CORS:      ${env.CORS_ORIGIN}\n`)
})
