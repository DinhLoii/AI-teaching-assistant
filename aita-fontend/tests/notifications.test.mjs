import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

const item = (id, read = false) => ({ id, title: id, message: id, type: 'SYSTEM', createdAt: '2026-10-16T10:00:00Z', isRead: read })
function setup(handler) {
  const storage = { getItem: key => key === 'aita_token' ? 'token' : null }
  const load = createLoader({ localStorage: storage, sessionStorage: storage, window: {}, fetch: async (url, options) => {
    const data = await handler(url, options)
    return { ok: true, status: 200, json: async () => ({ data }) }
  } })
  return { load, feed: new (load('lib/notifications/feed.ts').NotificationFeed)() }
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
function deferred() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

test('snapshot accepts an empty inbox and all notification reads bypass the API cache', async () => {
  const calls = []
  const { feed } = setup((url, opts) => { calls.push(opts.cache); return url.includes('unread-count') ? { count: 0 } : [] })
  await feed.refresh()
  assert.equal(feed.getSnapshot().items.length, 0)
  assert.equal(feed.getSnapshot().loading, false)
  await feed.refresh()
  assert.equal(calls.length, 4)
  assert.ok(calls.every(value => value === 'no-store'))
})

test('new events appear immediately, deduplicate and cannot be overwritten by an older snapshot', async () => {
  const pending = deferred()
  let calls = 0
  const { feed } = setup(url => url.includes('unread-count') ? { count: 1 } : ++calls === 1 ? pending.promise : [item('new')])
  const load = feed.refresh()
  feed.receive({ type: 'NOTIFICATION', payload: item('new') })
  feed.receive({ type: 'NOTIFICATION', payload: item('new') })
  assert.equal(feed.getSnapshot().items.length, 1)
  assert.equal(feed.getSnapshot().unreadCount, 1)
  pending.resolve([item('old')])
  await load
  await flush()
  assert.equal(feed.getSnapshot().items[0].id, 'new')
  assert.equal(calls, 2)
})

test('failed deletion restores the affected row and preserves notifications arriving in-flight', async () => {
  const pending = deferred()
  let rows = [item('old')]
  const { feed } = setup(async (url, opts) => {
    if (opts.method === 'DELETE') { await pending.promise; throw new Error('write failed') }
    if (url.includes('unread-count')) return { count: rows.length }
    return rows
  })
  await feed.refresh()
  const write = feed.mutate('delete', 'old')
  const rejected = assert.rejects(write)
  await flush()
  assert.equal(feed.getSnapshot().items.length, 0)
  rows = [item('new'), item('old')]
  feed.receive({ type: 'NOTIFICATION', payload: item('new') })
  pending.resolve()
  await rejected
  await flush()
  assert.deepEqual(Array.from(feed.getSnapshot().items, n => n.id).sort(), ['new', 'old'])
  assert.equal(feed.getSnapshot().unreadCount, 2)
  assert.match(feed.getSnapshot().error, /Thao tác/)
})

test('read/delete events synchronize badges immediately and ignore duplicate read frames', async () => {
  const pending = deferred()
  const { feed } = setup(url => url.includes('unread-count') ? { count: 2 } : pending.promise)
  feed.receive({ type: 'NOTIFICATION', payload: item('a') })
  feed.receive({ type: 'NOTIFICATION', payload: item('b') })
  feed.receive({ type: 'NOTIFICATION_READ', payload: { notificationId: 'a' } })
  feed.receive({ type: 'NOTIFICATION_READ', payload: { notificationId: 'a' } })
  assert.equal(feed.getSnapshot().unreadCount, 1)
  feed.receive({ type: 'NOTIFICATION', payload: item('a') })
  assert.equal(feed.getSnapshot().unreadCount, 1)
  feed.receive({ type: 'NOTIFICATION_DELETED', payload: { notificationId: 'b' } })
  assert.equal(feed.getSnapshot().unreadCount, 0)
  feed.receive({ type: 'ALL_DELETED' })
  assert.equal(feed.getSnapshot().items.length, 0)
  feed.stop()
  pending.resolve([])
  await flush()
})

test('stopped session rejects late responses and a new feed starts empty', async () => {
  const pending = deferred()
  const { feed } = setup(url => url.includes('unread-count') ? { count: 99 } : pending.promise)
  const load = feed.refresh()
  feed.stop()
  pending.resolve([item('private')])
  await load
  assert.equal(feed.getSnapshot().items.length, 0)
  assert.equal(feed.getSnapshot().unreadCount, 0)
})

test('notification timestamps preserve the server instant and links never guess assignment IDs from titles', () => {
  const { load } = setup(() => [])
  const { normalizeNotification } = load('lib/notifications/feed.ts')
  const { notificationTarget, notificationTime } = load('lib/notifications/presentation.ts')
  assert.equal(normalizeNotification({ createdAt: '2026-10-16T17:00:00+07:00' }).createdAt, '2026-10-16T10:00:00.000Z')
  assert.equal(normalizeNotification({}).createdAt, null)
  assert.equal(notificationTarget({ title: 'PRJ301 Đã có điểm' }, 'student'), '/student/notifications')
  assert.equal(notificationTarget({ referenceType: 'SUBMISSION', referenceId: 'real-id' }, 'student'), '/student/grading/result/real-id')
  assert.match(notificationTime('2026-10-16T10:00:00Z', Date.parse('2026-10-16T10:15:00Z'), 'vi'), /15.*phút/)
  assert.equal(notificationTime(null, Date.now(), 'vi'), 'Chưa rõ thời gian')
})

test('missing timestamps sort last rather than appearing as newly created notifications', async () => {
  const { feed } = setup(url => url.includes('unread-count') ? { count: 2 } : [{ ...item('z'), createdAt: null }, item('a')])
  await feed.refresh()
  assert.deepEqual(Array.from(feed.getSnapshot().items, n => n.id), ['a', 'z'])
})

test('authenticated stream decodes split UTF-8/CRLF frames and stops on disconnect', async () => {
  let streamController, requested
  const stream = new ReadableStream({ start(controller) { streamController = controller } })
  const { load } = setup(() => [])
  const storage = { getItem: () => 'secret-token' }
  const streamLoad = createLoader({ TextDecoder, AbortController, localStorage: storage, sessionStorage: storage, window: {},
    fetch: async (url, options) => { requested = { url, options }; return { ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }), body: stream } } })
  const socket = new (streamLoad('lib/websocket/notification-socket.ts').NotificationSocket)()
  const events = []
  socket.onEvent = event => events.push(event)
  socket.connect('unused')
  const encoded = new TextEncoder().encode('data: {"type":"CONNECTED"}\r\n\r\ndata: {"type":"NOTIFICATION","payload":{"title":"Thông báo"}}\r\n\r\n')
  for (const byte of encoded) streamController.enqueue(new Uint8Array([byte]))
  await flush()
  assert.equal(requested.url, '/api/notifications/stream')
  assert.equal(requested.options.headers.Authorization, 'Bearer secret-token')
  assert.equal(events.length, 2)
  assert.equal(events[1].payload.title, 'Thông báo')
  assert.equal(socket.isConnected(), true)
  socket.disconnect()
  streamController.close()
  await flush()
  assert.equal(socket.getStatus(), 'disconnected')
})
