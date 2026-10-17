# Assignment trash

Moving an assignment to trash uses `DELETE /grading/assignments/:id`. The client
does not fall back to another delete endpoint when this request fails.

The backend updates Exam and PublishedAssignment together in a transaction;
legacy records with only one representation are supported. Failure is returned
to the caller instead of being swallowed. Cache invalidation follows commit so
assignment lists and details refresh immediately. Assignment list reads no longer
schedule writes that could race a restore. When both representations exist,
restoring preserves the pre-trash exam status, including drafts.

The lecturer screen disables repeated trash actions while requests are pending,
shows progress and success/error messages, refreshes both lists, and retains
failed selections after a partially successful bulk action. Failed trash reads
retain existing rows and show an error instead of replacing them with an empty
list. Trash reads bypass client cache.

Both lists load on entry so the trash counter is populated without opening the
tab. Each successful trash/restore/permanent-delete response immediately updates
both local lists and selection; fresh reads reconcile them afterwards. Request
versions prevent reads started before a mutation from overwriting its newer state.
All three actions show progress and guard repeated submissions. Bulk operations
retain failed selections and update successful items independently.

Permanent deletion uses a single transaction for the assignment and dependent
grading/submission records. Related sandbox executions, grading jobs, appeals and
submission artifacts are removed before their parents. Reusable rubric library
records are detached. It refuses active assignments and supports retries after a
completed deletion. Failures roll back and return an error; there is no successful
soft-delete fallback. Cache invalidation runs only after commit. Tests simulate
these operations and failures without deleting real assignment data.

The trash query lives in a type-checked module using `Prisma.ExamFindManyArgs`.
It reads only `ExamClass.ClassId`; Class has no `Name` field. Read failures return
a user-facing message without exposing Prisma internals, and the screen shows an
unavailable state rather than claiming the trash is empty. Loading has its own
skeleton. A schema-based test validates selected fields against generated Prisma
metadata. `scripts/check-assignment-trash-readonly.mjs` verifies the exact query
on the configured database without modifying records.

Validation: `assignment-trash.test.mjs` checks transactional updates, rollback,
legacy records, cache invalidation and rejection without fallback deletion.
`assignment-trash.browser.cjs` covers cancel, confirmed single deletion, loading,
trash after reload, restore and partial bulk failure with intercepted API fixtures.
Neither test writes to the real database.
