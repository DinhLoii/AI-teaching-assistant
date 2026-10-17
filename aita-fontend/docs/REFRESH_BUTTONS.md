# Refresh controls

Use `RefreshAction` from `src/components/actions/RefreshAction.tsx` for manual
data refreshes. It localizes the action and invalidates the supplied API cache
paths before awaiting the screen loader. `RefreshButton` in `components/ui`
contains only UI state and receives its labels and callback through props.

The loader must return its actual request promise. Pass a background flag so
refreshing keeps existing cards/rows visible. A failed background request must
reject before replacing existing data with empty fallbacks; the button displays
a retryable error. Pass initial loading through `disabled`, and an existing
refresh state through `busy` when the screen already manages one.

The control locks repeated clicks synchronously, stays busy until the loader
settles, uses a stable width, labels icon-only controls, announces loading, and
respects reduced motion. No artificial delay is added. Only invalidate resources
read by the screen; do not clear every page's cache for a local refresh.

Integrated screens: student assignments, results, classes, subjects and course
retry; lecturer submissions and grading history; admin users, submissions,
reports, semesters, system health and audit logs. Audit logs currently redirect
to the admin overview in `next.config.ts`; its underlying screen is updated but
that route is not exercised by the browser suite. Scan/regrade/retry-job actions
are separate mutations and keep their existing controls.

Validation: `tests/system-refresh.browser.cjs` exercises six accessible screens
across all roles with intercepted API data; `tests/student-classes-refresh.browser.cjs`
covers classes. Both check cache bypass, delayed responses, duplicate clicks,
stable sizing, retained data, and failure recovery. The system suite also checks
icon-only rendering and reduced motion. Run against a local production build
using `TEST_BASE_URL` (default `http://localhost:5194`). No real database writes.
