# AITA — Vercel frontend / Render backend

Reviewed 2026-10-31. This is a deployment runbook, not evidence of a completed deployment.

## 1. Preserve existing accounts (owner choice)

The owner explicitly requested keeping all current accounts and passwords. Connect the deployed API to the same database (or a faithful restored copy) to retain those credentials. Production preflight only warns about known active demo passwords; it does not block startup or modify accounts because of them. Publicly known default passwords remain a security risk accepted for this configuration.

Do not run `security:demo -- --apply` under this choice: that optional tool would change the retained admin password and deactivate other insecure demo accounts. It has not been applied. Deploying with a new empty database does not automatically copy local accounts.

Disable `ENABLE_DEV_SEED` everywhere outside a disposable development database. Existing tokens issued before the security changes require signing in again.

## 2. Reconcile the existing database before migration

The existing database was observed with schema objects already present but three repository migrations not recorded. Do not run `prisma migrate reset`, `db push --accept-data-loss`, or blindly apply/mark all migrations.

1. Take a verified database backup and restore it into a separate staging database. Keep production credentials out of logs.
2. Inspect `prisma/migrations/*/migration.sql` and run `npx prisma migrate status` against the clone.
3. Compare each migration's tables, columns, indexes, constraints and data updates against the clone. `prisma migrate diff --from-url "$env:DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script` can reveal schema differences; it does not validate historical data updates or every extension. Capture the SQL without applying it automatically.
4. Only for migrations proved fully reflected in that database, record the exact directory name with `npx prisma migrate resolve --applied <verified-migration-name>`. A missing object or data change requires a reviewed reconciliation migration first. Do not guess the baseline.
5. Apply genuinely pending migrations on the clone, test authentication, class gradebooks, submissions, grade publication and queue recovery, and verify row counts and restored files. Repeat the approved reconciliation on the intended deployment database.
6. Run `npm run db:preflight` with the actual production environment. It warns about known default passwords and enforces migration ledger, writable storage and mail configuration. It is not a substitute for schema drift checks or a restore rehearsal.

An empty database can use `npm run db:migrate` directly. It still needs a securely provisioned administrator; do not seed production with the demo fixture accounts.

## 3. Render API

Use the root `render.yaml` as a reviewed template. It creates a paid Docker service with a persistent disk, disables automatic deployment and uses `/api/ready` for database readiness. No Render resource has been created by this review.

Set `DATABASE_URL` (pooled PostgreSQL) and `DIRECT_URL` (direct migration connection), a random `JWT_SECRET` of at least 32 characters, exact HTTPS `CORS_ORIGIN` entries separated by commas, and the HTTPS `FRONTEND_URL`. Configure either Resend (`RESEND_API_KEY` and a verified `EMAIL_FROM`) or complete SMTP credentials. Set a valid AI provider key/model for the account's supported models; model availability must be tested with that provider. Do not use development stubs.

The disk is mounted at `/app/storage`; `RUNTIME_DATA_DIR=/app/storage` puts uploads, private archives and grading artifacts below it. The image prepares this mount directory for the nonroot `node` user. Verify mounted disk ownership and an upload/download/restart round trip on the actual Render instance. Existing files in legacy `uploads/`, `storage/submissions/` and `artifacts/files/` must be copied to the corresponding new roots before switching; changing the environment variable does not migrate files. Preserve private permissions. Back up both PostgreSQL and these files together.

The pre-deploy command applies migrations only. Disk checks run at application startup because Render's build and pre-deploy instances cannot access the persistent disk. Disk-backed deployments may have downtime; schedule migrations and deployments accordingly. See [Render disks](https://render.com/docs/disks) and [deploy lifecycle](https://render.com/docs/deploys).

Keep one API instance with this local-disk design. Multiple API/worker instances need shared object storage and coordinated backups. Set `TRUST_PROXY_HOPS` only after verifying the actual reverse-proxy chain; never set unrestricted trust. Account/OTP limits remain effective behind a shared proxy, although IP limits can conservatively group users if proxy trust is not configured.

### Execution grading boundary

The template enables the durable worker for source review but leaves Docker execution flags disabled. It does not offer full isolated execution of arbitrary student projects on Render. Full C/C++/Java/API/browser execution needs a dedicated trusted grading host with an available Docker daemon, resource isolation, the required toolchain images, and private file access. The repository currently uses an in-process worker and local artifact roots; a separate host requires implementing and validating the worker/file-transfer topology before enabling those grading modes. A Dockerfile on Render does not itself provide a nested Docker daemon. Unsupported execution must remain an explicit failure/skip, never a fabricated passing result.

## 4. Vercel frontend

Import this repository as Next.js with **Root Directory `aita-fontend`**; install `npm ci`, build `npm run build`, output Next.js default. The root-level legacy SPA configuration has been removed. Use Node 22 with a current supported patch. See [Vercel monorepos](https://vercel.com/docs/monorepos) and [build configuration](https://vercel.com/docs/builds/configure-a-build).

Set `NEXT_PUBLIC_API_URL` to the HTTPS Render URL ending in `/api` and `API_PROXY_TARGET` to the same backend origin without `/api`. Do not use `/api` alone for the public URL with this Next rewrite configuration. Rebuild after changing public environment variables. Vercel receives no database, SMTP, JWT or AI secrets. Add the final Vercel/custom domain to backend `CORS_ORIGIN` and `FRONTEND_URL`. Preview deployments require an explicit allowed origin if they need backend access.

Large files should go directly from browser to the Render API; Vercel function/proxy request limits can be smaller than the application's upload limits. Verify the maximum permitted file size and attachment downloads on the actual hosting plans. Private archives must return 401/403/404 without a valid scoped session. Public avatar URLs can remain public.

## 5. Acceptance before opening access

- Both health and readiness checks succeed; startup rejects invalid production settings.
- Login, refresh, logout, forced password change, account lock and password-reset email delivery work with real accounts; old sessions stop working after reset/lock.
- Admin gradebook: semester → class → subject → students; weights, zero scores, concurrent edit conflicts, publication, audit history and Excel export work on staging.
- Lecturer cannot access another lecturer's roster or modify its classes; students cannot use staff AI actions or retrieve another student's submission/context.
- Upload, download and report artifacts survive a service restart. A real restore drill recovers database and files.
- Actual AI provider responses and email delivery are tested with controlled fixtures; no fabricated testcase execution.
- Review-mode load/latency, quotas, alerts, log retention, disk usage and database connection budget meet the expected enrollment. Full sandbox execution needs its separate acceptance described above.
- Review full dependency audits and existing lint/`ts-nocheck` debt; production dependency audits do not cover every possible vulnerability.

Deployment, real email/AI delivery, hosted load tests and disaster recovery have not been verified merely by the local build/test report.
