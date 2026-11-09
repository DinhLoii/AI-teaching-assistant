# FER202: GitHub + Vercel submissions

Students can choose ZIP (existing flow) or GitHub + Vercel for FER202. Both URLs are required in link mode. GitHub must be a public repository root; Vercel must be HTTPS on a *.vercel.app host. Paths such as /login are allowed.

At submission time, the server checks enrollment, assignment status, deadline and extensions before contacting GitHub. It resolves the default branch HEAD to a commit SHA using the GitHub API, downloads that exact commit archive (45 second total timeout, 100 MB limit), validates the archive and required language, and saves it to private submission storage. An empty supported-source archive is rejected. GitHub errors do not create a submission. No credentials or private repository tokens are accepted.

GithubUrl, VercelUrl and SourceCommit are nullable fields on Submission. Each new attempt retains its own archive and metadata. The existing transaction, latest-attempt handling, manual UI start policy, late penalties and grade publication rules apply. Vercel is a clickable demonstration reference, not an automatic grading target or an immutable deployment snapshot. The server does not request the deployment URL.

## Submission flow

Open a FER202 assignment as an enrolled student and choose GitHub + Vercel. Enter your public repository root URL and the HTTPS URL of your deployed Vercel website. Both links are required. Confirm submission, then inspect its receipt, saved source and commit. Lecturer and administrator submission lists and report/history views display the submitted links. The lecturer starts grading through the existing UI grading controls and publishes the result normally.

## Database and release

Generate Prisma Client and apply prisma/migrations/20261105000000_github_submissions/migration.sql before starting the updated API. Standard databases with a recorded migration baseline can use npm run db:migrate. The SQL is additive and idempotent.

On 2026-11-05 the configured database reported all earlier baseline migrations as unapplied. Only the additive SQL for these three fields was executed successfully using prisma db execute; historical migrations were not replayed or marked applied. This database's pre-existing migration-history discrepancy remains and must be reconciled according to PRODUCTION_DEPLOYMENT.md before switching it to history-mode migration checks. Source changes still require deploying the updated backend and frontend; this implementation does not publish or push code automatically.

## Verification

Backend: node --import tsx --test tests/github-submission.test.ts tests/submission-extension.test.ts
Frontend: npm run typecheck; npm run check:structure
Browser: node --test tests/submission-modal.browser.cjs
Regression: node --test tests/submission-provenance.test.mjs tests/submission-workspace.test.mjs

GitHub download responses are controlled in automated tests; no real student submission or live grading job is created.
