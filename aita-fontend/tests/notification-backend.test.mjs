import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

function load(file, mocks) {
  const filename = path.resolve('../aita-backend/src', file)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  const record = { exports: {} }
  const require = name => {
    const key = Object.keys(mocks).find(key => name.endsWith(key))
    if (!key) throw new Error(`Missing mock: ${name}`)
    return mocks[key]
  }
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { console, Date, Buffer, setTimeout, clearTimeout, setInterval, clearInterval, process })(require, record, record.exports)
  return record.exports
}

test('recipient reads include nullable unread rows and scope writes to the authenticated user', async () => {
  const queries = []
  const prisma = { notificationRecipient: { updateMany: async args => queries.push(args), deleteMany: async args => queries.push(args) } }
  const { PrismaNotificationRepository } = load('modules/notifications/infrastructure/repositories/prisma-notification-repository.ts', { 'notification.entity.js': { Notification: {} } })
  const repo = new PrismaNotificationRepository(prisma)
  await repo.markAsRead('user-a', 'notification-a')
  await repo.markAllAsRead('user-a')
  await repo.deleteForUser('user-a', 'notification-a')
  assert.ok(queries.every(q => q.where.UserId === 'user-a'))
  assert.equal(queries[0].where.NotificationId, 'notification-a')
  assert.deepEqual(JSON.parse(JSON.stringify(queries[0].where.OR)), [{ IsRead: false }, { IsRead: null }])
  assert.deepEqual(JSON.parse(JSON.stringify(queries[1].where.OR)), [{ IsRead: false }, { IsRead: null }])
})

test('REST read/delete emits a user-scoped realtime event only after a successful write', async () => {
  const events = [], operations = []
  class BaseController { ok() {} }
  const { NotificationsController } = load('modules/notifications/presentation/notifications.controller.ts', {
    'middleware/auth.js': { authenticateLiveToken: async () => ({ id: 'user-a' }) },
    'messages.js': { MESSAGES: {} }, 'base-controller.js': { BaseController }, 'database/prisma.js': { prisma: {} },
    'sse-service.js': { sseService: { push: (id, event) => events.push({ id, event }) } },
  })
  const success = { execute: async userId => operations.push(userId) }
  const logger = { info() {}, debug() {} }
  const ctrl = new NotificationsController(success, success, success, success, success, success, logger)
  const req = { user: { id: 'user-a' }, params: { id: 'notification-a' } }
  await ctrl.markAsRead(req, {})
  await ctrl.deleteNotification(req, {})
  assert.deepEqual(operations, ['user-a', 'user-a'])
  assert.deepEqual(events.map(e => e.id), ['user-a', 'user-a'])
  assert.deepEqual(events.map(e => e.event.type), ['NOTIFICATION_READ', 'NOTIFICATION_DELETED'])
  const fail = new NotificationsController(success, { execute: async () => { throw new Error('DB failure') } }, success, success, success, success, logger)
  await assert.rejects(fail.markAsRead(req, {}))
  assert.equal(events.length, 2)
})

test('publish deduplicates recipients, preserves persisted time, and excludes hidden reminders', () => {
  const events = []
  const { publishNotification } = load('shared/infrastructure/publish-notification.ts', {
    'sse-service.js': { sseService: { push: (id, event) => events.push({ id, event }) } },
  })
  const date = new Date('2026-10-16T10:00:00Z')
  publishNotification(['a', 'a', 'b'], { Id: 'id', Title: 'Title', Type: 'ASSIGNMENT', CreatedAt: date })
  publishNotification(['a'], { Id: 'hidden', Type: 'Reminder' })
  assert.deepEqual(events.map(e => e.id), ['a', 'b'])
  assert.equal(events[0].event.payload.createdAt, date.toISOString())
})

test('empty class announcements never fall back to all students; unrelated lecturers cannot manage them', async () => {
  let lookupUsers = 0, recipientWrites = 0
  class ForbiddenError extends Error {}
  class BaseController { created() {} ok() {} }
  const prisma = {
    instructorClass: { findFirst: async ({ where }) => where.ClassId === 'assigned' ? { UserId: where.UserId } : null },
    notification: { create: async ({ data }) => ({ ...data, User: null }) },
    notificationRecipient: { createMany: async () => { recipientWrites++ } },
    user: { findMany: async () => { lookupUsers++; throw new Error('Unexpected broad user lookup') } },
  }
  const { ClassesController } = load('modules/classes/presentation/classes.controller.ts', {
    'middleware/auth.js': { authenticateLiveToken: async () => ({ id: 'teacher' }) },
    'class.dto.js': {},
    'database/prisma.js': { prisma }, 'base-controller.js': { BaseController }, 'messages.js': { MESSAGES: {} },
    'class-events.js': { classEvents: { emit() {} } }, 'nodemailer.service.js': { NodemailerService: class {} },
    'app.error.js': { ForbiddenError, ValidationError: Error, NotFoundError: Error },
    'memory-cache.js': { memoryCache: {} }, 'publish-notification.js': { publishNotification() {} },
    'sse-service.js': { sseService: { push() {} } },
  })
  const ctrl = Object.create(ClassesController.prototype)
  ctrl.logger = { info() {}, warn() {} }
  const teacher = { id: 'teacher', role: 'LECTURER' }
  await assert.rejects(ctrl.assertCanManageAnnouncement(teacher, 'someone-elses-class'), ForbiddenError)
  ctrl.resolveTargetRefIds = async () => ({ targetRefIds: [], classCode: 'EMPTY', subjectCode: 'TEST', cls: { Id: 'assigned', StudentClass: [] }, subject: null })
  await ctrl.createAnnouncement({ user: teacher, params: { id: 'assigned' }, body: { title: 'Empty class', content: 'Notice' } }, {})
  assert.equal(lookupUsers, 0)
  assert.equal(recipientWrites, 0)
})
