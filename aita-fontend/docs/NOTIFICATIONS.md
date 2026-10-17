# Notifications

All three inboxes, dashboard notification feeds, sidebar badges and topbar badges
consume one session-scoped `NotificationFeed` through `NotificationProvider`.
The server remains authoritative. Notification REST reads bypass both the browser
HTTP cache and the general application GET cache, with a 15-second deadline.

## Delivery and recovery

`GET /api/notifications/stream` uses authenticated fetch streaming over the same
API origin and proxy as REST. Bearer tokens are sent in headers, not URLs. It has
25-second server heartbeats, a 45-second client inactivity watchdog, jittered
reconnect backoff, and reauthentication at token expiry. The proxy must forward
streamed responses without buffering or compression. Express excludes this route
from compression and sets `X-Accel-Buffering: no`.

New messages are inserted immediately by ID. Read/delete events update every
open connection for the recipient. A fresh snapshot on reconnect recovers events
lost while offline. Visible tabs reconcile every 60 seconds while connected,
every 15 seconds while disconnected, and on returning to the tab or going online.
Cross-tab broadcasts request reconciliation; they do not forward private message
contents. The stream is closed and the store is isolated on account change.

Mutations run through REST with optimistic feedback, serialized local writes,
rollback on failure, and server reconciliation. The feed rejects snapshots
started before a newer event/write. Duplicate delivery does not reset a message's
read state. Explicit announcement updates may reset it. Empty server responses
clear the inbox. Older messages are loaded in bounded pages of 50; badges use the
server's unread total rather than counting a partial page.

Creation paths publish only after notification and recipient persistence. Hidden
automatic reminders retain the existing visibility policy and are excluded from
both feed and badge. Class notices target enrolled recipients; an empty class
does not fall back to sending to all students.

Creation timestamps come from persisted records. The client uses server clock
offset and refreshes relative labels every 30 seconds; exact local timestamps are
available on hover. Assignment deadlines in generated notifications use
Asia/Ho_Chi_Minh explicitly. Missing timestamps are never replaced with “now”.

## Deployment scope

Immediate fan-out is in process. Deploy a single notification API process for
immediate delivery to every connection. Multiple API replicas or separate worker
processes need a shared pub/sub or transactional outbox relay before claiming
immediate cross-instance delivery. Periodic reconciliation repairs missed events
but is not a distributed event bus. This change does not add that infrastructure
or deploy the application.

## Verification

Frontend: `npm test`, `npm run check:structure`, `npm run typecheck`, and
`npm run build -- --webpack`. Backend: `npm run build`.

With the frontend production server on port 5194, run
`node tests/notifications-realtime.browser.cjs`. It starts an isolated mock API
stream on port 3001 and tests the real Next.js proxy; leave the actual backend
stopped for this test. It covers all roles, two tabs, duplicate delivery,
read/delete synchronization, failed-write rollback and reconnect recovery.
It neither connects to the real database nor sends real notifications.
