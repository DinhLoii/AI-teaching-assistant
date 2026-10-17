# Admin analytics

`GET /api/reports` is authenticated and admin-only. Both admin screens use the
same snapshot API; its single PostgreSQL statement keeps cards, role totals and
charts internally consistent. Browser/API response caching is disabled for this
snapshot. No mock totals, fabricated percentages or synthetic curves are used.

## Definitions

- User/class/subject/assignment totals are current global totals, not limited to
  the selected activity window or the first page of an admin list. Deleted
  assignments are excluded. Locked accounts still exist and count toward totals.
- Accounts count once, with role precedence admin → lecturer → student → other.
  The chart geometry and percentages derive from these counts.
- Daily submissions count every attempt by `SubmittedAt`. Daily grading counts
  successful completed grading by `GradedAt`. They are different event cohorts:
  grading on a date may belong to a submission before the selected range.
- Grades use the newest submission per student/exam/class across all dates,
  then filter by submission date and `ReviewStatus=PUBLISHED`. Latest is ranked
  by submission time, attempt number and ID; nullable/stale `IsLatest` flags do
  not duplicate attempts. Only nonnegative `FinalScore` within a known positive
  maximum is eligible. Normalize to 10 using `Exam.TotalPoints`, with the engine's
  stored `Submission.TotalScore` maximum as fallback. Zero is a valid score.
- Average is the arithmetic mean per eligible submission, not a credit-weighted
  academic GPA. Pass threshold is 5/10; histogram boundaries are 9, 8, 6.5, 5.
- Dates are inclusive Vietnamese calendar dates (UTC+7); SQL uses an exclusive
  next-day endpoint and converts Prisma's UTC timestamp columns for grouping.
  7d/30d produce exactly 7/30 daily buckets, including zero days. Year starts
  January 1. Semester uses configured active-semester dates, capped at today;
  missing configuration returns 400. Custom ranges are validated, at most 366 days.
- The current User schema has no persisted major field, so major distribution
  explicitly shows unavailable. No inference from IDs or names is made.
- Backup status is unavailable until a real monitoring source is connected.
  CPU is sampled from two OS CPU-time snapshots; RAM, uptime and DB query latency
  are measured. AI-engine readiness is unknown without a real readiness probe.

## Updating

Successful relevant REST writes invalidate server stats caches and send an
`ANALYTICS_INVALIDATED` event after the response finishes. Completed engine
grading/deletion also sends invalidation after persistence. Events are coalesced
for 150ms and sent only to authenticated admin SSE connections. They contain no
user or grade data. The existing notification connection carries these events
without adding them to the inbox or unread count. Successful same-tab mutations
also trigger local invalidation.

Clients coalesce events for 250ms, allow one request at a time, queue a newer
invalidation and discard the superseded snapshot, abort on filter/account
changes, and preserve the last good data on refresh failure. Each request has a
20-second timeout. Reconnect, visibility and online events reconcile data, with
a 30-second visible-tab fallback for missed events/direct database writes.

Immediate SSE fan-out uses the existing in-process service: it applies to the
current single API/embedded grading-engine deployment. Separate workers or
multiple API replicas need a shared pub/sub bus for immediate cross-process
delivery; the 30-second reconciliation remains correct but is not instantaneous.

## Verification

- `npm test`: range boundary/validation, mutation success/failure timing,
  event coalescing, admin-only SSE and existing regression tests.
- `node tests/admin-analytics.browser.cjs`: mocked REST plus actual local SSE
  service, both admin screens, updates/bursts/stale snapshots, filters, export,
  failures/retry, reconnect, zero data and mobile layout.
- Backend `node scripts/check-analytics-readonly.mjs`: queries the configured
  database in an explicitly READ ONLY repeatable-read transaction; asserts global
  counts, role totals, daily sums and histogram totals. It never writes records.
