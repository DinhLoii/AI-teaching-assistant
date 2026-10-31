# Render Free — demo deployment

This guide uses the current backend with database checks intact and an explicit option to disable mail for the demo. No paid disk or paid pre-deploy command is required for the demo configuration.

## Service form

- Source branch: main (must contain the backend fixes).
- Language: Docker.
- Root Directory: aita-backend.
- Dockerfile Path: ./Dockerfile.
- Docker Build Context, if shown: .
- Compute: Free.
- Docker Command: leave empty; the Dockerfile starts node dist/server.js.
- Health Check: /api/ready.
- Persistent Disk: none.
- Pre-Deploy Command: none; this feature is not available for Free web services.

Keep RUNTIME_DATA_DIR=/app/storage. This is a writable directory inside the container, not a persistent disk on Free. The startup check verifies that it can be written; it cannot establish that a Render disk is actually attached.

## What survives a restart

Use the existing Neon database to retain accounts/passwords, classes, grades and other database rows. The uploaded ZIP archives, attachments, local avatars and artifacts written inside Render do not survive service restarts, redeploys or idle shutdown. Configuring Cloudinary credentials alone does not move these files there: the current ZIP submission use case writes to local private storage.

Use small disposable uploads for demonstrations. Persistent storage of private student submissions needs a separate implementation of authenticated remote storage, or a paid disk. Do not describe the current Free setup as durable file storage.

## Environment

Import the private local aita-backend/.env.render file through Add from .env, using current valid secrets. It is Git-ignored and must not be committed. Keep NODE_ENV=production, ENABLE_DEV_SEED=false, AI_STUB_MODE=false, SANDBOX_ENABLED=false, STDIO_SANDBOX_ENABLED=false and GRADING_WORKER_ENABLED=true. Keep DATABASE_URL/DIRECT_URL pointing to the intended existing database.

FRONTEND_URL and CORS_ORIGIN may temporarily be https://example.invalid while creating the API. Replace both with the actual HTTPS Vercel origin after frontend deployment. This temporary value allows startup but does not allow the future frontend's cross-origin requests yet.

To skip Resend/SMTP as requested, set EMAIL_ENABLED=false on Render after deploying the code that supports this setting. RESEND_API_KEY and EMAIL_FROM may be removed or left empty. Login and current credentials remain available; sending mail, OTP password recovery and the email-based admin reset return 503 before changing account data. In-app notifications still work. Email is enabled by default: to re-enable it, set EMAIL_ENABLED=true and provide a real mail provider. On Free use the existing Resend HTTPS integration because common SMTP ports are blocked.

## Database migrations from the local machine

### Deployment-only demo with the existing database

For the requested deployment-only demonstration while presenting functionality on localhost, use the latest code and set `MIGRATION_CHECK_MODE=schema`. Startup reads PostgreSQL column metadata and checks all Prisma model columns for presence, compatible scalar types and required nullability. It does not create tables, change account/password/grade data or record migration history. Missing/incompatible columns still block startup. The existing Neon database passed this check for 56 models and 472 columns on 2026-10-31.

This compatibility check is not a migration baseline reconciliation: it does not verify indexes, constraints, native type sizes/precision, extension behavior or historical data transformations. Extra indexes are retained. The default `MIGRATION_CHECK_MODE=history` keeps the strict migration-ledger requirement for an actual production release. Invalid mode values fail closed.

Set `GRADING_WORKER_ENABLED=false` on the deployment-only instance so it does not process the same database's pending grading jobs while localhost is used for the presentation. Keep `EMAIL_ENABLED=false` to skip mail. On Render, merge this code first, set these environment variables, then use Manual Deploy → Deploy latest commit. Keep Docker Command empty; do not run migrations/reset as part of this demo startup.

### Full production migration reconciliation

Free has no Shell or pre-deploy command. Manage the database from a trusted local terminal using its direct connection. Start with the read-only command from aita-backend:

```powershell
npx prisma migrate status
```

The existing database was previously observed with three unapplied migration records despite existing schema objects. Do not reset, blindly deploy those migrations, or mark them all applied. Follow the backup/clone/schema-and-data reconciliation procedure in PRODUCTION_DEPLOYMENT.md section 2. Once that reconciliation is verified, run npm run db:migrate locally against the intended database before deploying the API. Do not put migration execution in the Docker image build.

## Verify

For a deployment-only demo, use schema mode above after merging the latest code. For a full production release, reconcile the migration baseline and use history mode. Set EMAIL_ENABLED=false to skip mail configuration. Check /api/health and /api/ready, then connect Vercel and test each role. Allow for a cold start after inactivity. Free is a demonstration environment, not evidence of production reliability. Full isolated execution grading still needs a separate Docker grading host.

Official references: https://render.com/docs/free and https://render.com/docs/deploys.
