<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project architecture

- Read `docs/ARCHITECTURE.md` before changing source organization.
- Application code lives under `src/`; `@/*` resolves to `src/*`.
- Keep App Router pages thin. Feature screens belong in `src/features/<domain>/screens`.
- Import domain API clients from `src/lib/api/modules`; keep transport/storage independent of React.
- Keep UI primitives independent of features, providers and API clients.
- Update `docs/route-map.json` when adding or changing routes.
- Run `npm run check:structure`, `npm run typecheck` and relevant tests for structural changes.
- Existing functional gaps and lint debt are tracked in the repository-root audit/implementation plan. Do not silently disable rules or mark those gaps resolved after a file move.
