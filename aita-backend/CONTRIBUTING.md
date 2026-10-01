# AITA Backend — Developer Guide

> **Service:** `aita-backend/` — the AITA API.
> **Stack:** Node.js · Express 5 · TypeScript (ESM / NodeNext) · Prisma 6 + **SQL Server** · JWT (HS256, access+refresh) · bcryptjs · Zod · helmet · cors · morgan.
> **Architecture:** **Clean Architecture only** (`src/modules/*` + `src/shared/*`). The legacy flat layer (`src/controllers`, `src/services`, `src/repositories`) was **deleted** in the refactor — it no longer exists.
> **Last verified:** header re-synced 2026‑06‑29 after the Clean Architecture refactor (body sections below partially stale — see notice).
>
> ⚠️ **POST-REFACTOR NOTICE (2026-06-29).** This guide predates the refactor and **several sections below are still stale** (the §2 "15 endpoints / orphaned" narrative, the SQLite / `cuid()` / `{success,data}` claims, and the §7 walkthrough that references the flat layer). Corrected high-level facts:
> - **DB:** SQL Server (not SQLite); ids use **`uuid()`** (not `cuid()`); `DATABASE_URL` is a `sqlserver://…` string (no committed `.env.example`).
> - **Routing:** wired in **`src/shared/presentation/route-manager.ts`** (~17 module routers via the DI container) — there is no single `src/routes/index.ts`, and **no orphaned flat layer**.
> - **Responses:** controllers **extend `BaseController`** and call `this.ok/created(...)` with `MESSAGES.*` → envelope **`{ statusCode, Message, Data, timestamp }`** (PascalCase). The standalone `utils/response.ts` `ok()` is dead.
> - **Persistence:** repositories return **domain entities** and delegate row↔entity to `infrastructure/mappers/<x>.mapper.ts`.
> - **Auth:** V2 — access + refresh tokens (rotation, server-side logout, change-password) via injected ports (`ITokenService`/`IHashService`).
>
> For authoritative current conventions use the `aita-*` skills (`aita-be-architecture`, `aita-be-validation-and-auth`, `aita-be-prisma`, `aita-be-services-and-ports`, `aita-be-api-and-errors`, `aita-project-structure`) and the **Outline Product Bible**. A full section-by-section rewrite of this file is a pending follow-up.

New here? Read [§1 Quick start](#1-quick-start) → [§2 What actually runs today](#2-what-actually-runs-today-read-this-first) → [§4 Architecture](#4-architecture-the-target-pattern) → [§7 How to add a feature](#7-how-to-add-a-new-domain-module-the-golden-path).

---

## 1. Quick start

```bash
cd aita-backend
cp .env.example .env          # then edit JWT_SECRET (see §8) — do NOT ship the default
npm install                   # node_modules is not committed
npm run setup                 # prisma generate + db push + seed
npm run dev                   # tsx watch → http://localhost:3001
```

**Seeded demo accounts** (`prisma/seed.ts`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fpt.edu.vn` | `admin123` |
| Lecturer | `lecturer@fpt.edu.vn` | `lecturer123` |
| Student | `student@fpt.edu.vn` | `student123` |

Smoke test: `curl localhost:3001/api/health` → `{ "status": "ok", ... }`.

| Script | Does |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` — hot reload, **no type‑check** |
| `npm run build` | `tsc` — compiles `src/**/*`, **type‑checks everything incl. dead code** |
| `npm run start` | `node dist/server.js` |
| `npm run db:generate` / `db:push` / `db:seed` | Prisma client / schema push / seed |
| `npm run setup` | all three of the above in order |

> ⚠️ `npm run dev` (tsx) skips type‑checking, so the app can "run in dev" while `npm run build` (tsc, with `noUnusedLocals`/`noUnusedParameters` over the orphaned code) **fails**. Always run `npm run build` before claiming a change works. See [Risk #W0.4](../docs/CODEBASE_REVIEW.md#phase-0--stabilize--stop-the-bleeding-days).

---

## 2. What actually runs today (read this first)

The backend currently exposes **exactly 15 endpoints**, all under `/api`, defined in the one and only router `src/routes/index.ts`. Everything else you see in `src/controllers` / `src/services` is **orphaned** (compiled but never mounted). Treat `src/routes/index.ts` as the source of truth for "what works."

| Method | Path | Handler | Auth | Role check |
|---|---|---|---|---|
| GET | `/api/health` | inline | — | — |
| POST | `/api/auth/login` | `AuthController.login` | — | — |
| POST | `/api/auth/register` | `AuthController.register` | public | forces STUDENT |
| GET | `/api/auth/me` | `AuthController.getMe` | ✅ | — |
| POST | `/api/classes` | `ClassController.create` | ❌ **none** | ❌ none |
| GET | `/api/classes` | `ClassController.list` | ❌ **none** | ❌ none |
| PUT | `/api/classes/:id` | `ClassController.update` | ❌ **none** | ❌ none |
| POST | `/api/assignments` | `AssignmentController.create` | ❌ **none** | ❌ none |
| GET | `/api/assignments` | `AssignmentController.list` | ❌ **none** | ❌ none |
| PUT | `/api/assignments/:id` | `AssignmentController.update` | ❌ **none** | ❌ none |
| GET | `/api/users` | `UsersController.list` | ✅ | ❌ none |
| POST | `/api/users` | `UsersController.create` | ✅ | ❌ none |
| PATCH | `/api/users/:id` | `UsersController.update` | ✅ | ❌ none |
| DELETE | `/api/users/:id` | `UsersController.delete` | ✅ | ❌ none |
| PATCH | `/api/users/:id/lock` | `UsersController.toggleLock` | ✅ | ❌ none |

> 🔴 The ❌/❌ rows are **active security holes** (anonymous class/assignment writes; any logged‑in student can mint an ADMIN via `POST /users`). Do **not** add features on top of these routes without fixing the gates first — see [§5](#5-auth--security-rules) and [CODEBASE_REVIEW §4 risks #1–#2](../docs/CODEBASE_REVIEW.md#4-top-risks-confirmed-criticalhigh-prioritized).

**Wired vs orphaned** at a glance:

- **Wired:** `modules/auth`, `modules/classes`, `modules/assignments`, and the **legacy** `controllers/users.controller.ts` (+ `services/users.service.ts`).
- **Orphaned (13 controllers, ~1,500 LOC):** `ai`, `submissions`, `stats`, `reports`, `subjects`, `contents`, `discussions`, `notifications`, `options`, `settings`, and the legacy `auth`/`assignments`/`classes` duplicates. These hold the **real product** (AI grading, submissions, dashboards) but **no route reaches them.** Making them reachable is Phase 1 of the roadmap.

---

## 3. Directory structure

```
aita-backend/
├── prisma/
│   ├── schema.prisma          # 15 models + 7 enums (the full domain; only User/Class/Assignment are reached)
│   └── seed.ts                # demo users, a class, enrollment, 2 assignments, a submission
├── src/
│   ├── app.ts                 # express app: helmet, cors, morgan, json; mounts routes/index.ts at /api
│   ├── server.ts              # http listen (PORT, default 3001)
│   ├── routes/index.ts        # ⭐ the ONLY router — the entire API surface
│   ├── config/env.ts          # env parsing/validation (JWT_SECRET, CORS_ORIGIN, AI_*, …)
│   ├── database/prisma.ts     # PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.ts            # authenticate (JWT) + requireRoles (DEFINED BUT UNUSED) + signToken
│   │   └── errorHandler.ts    # global error → { success:false, error:{code,message,details} }
│   │
│   ├── modules/               # ⭐ TARGET: Clean Architecture (auth, classes, assignments)
│   │   └── <domain>/
│   │       ├── domain/        #   entities, repository INTERFACES, domain services (pure rules)
│   │       ├── application/   #   use-cases (one per operation) + DTOs
│   │       ├── infrastructure/persistence/   # repository IMPLEMENTATION (Prisma)
│   │       └── presentation/  #   controller (HTTP) + presenter (entity → response DTO)
│   │
│   ├── shared/
│   │   ├── application/        # app.error.ts (THE AppError to use), base-use-case.ts
│   │   ├── domain/             # base-entity.ts, domain-event.ts (event machinery is currently inert)
│   │   └── infrastructure/     # di-container.ts (hand-wired), logger.ts
│   │
│   ├── controllers/ services/ repositories/ validations/   # 🟥 LEGACY flat layer — do not extend
│   ├── utils/                 # response.ts (ok()), async-handler.ts, errors.ts (legacy AppError — avoid), mappers.ts…
│   └── types/express.d.ts     # augments Express Request with req.user
```

### Known structural traps (until cleanup lands)
- **Two `AppError` classes:** use `src/shared/application/app.error.ts`. The legacy `src/utils/errors.ts` one is *not* recognized by `errorHandler` → throwing it yields HTTP 500 instead of your intended status. ([Risk #7](../docs/CODEBASE_REVIEW.md#4-top-risks-confirmed-criticalhigh-prioritized))
- **Two async handlers:** the wired router uses `src/utils/async-handler.ts`. Ignore `src/utils/asyncHandler.ts` (legacy).
- **Two repositories** for user/class/assignment (one under `src/repositories`, one under `modules/*/infrastructure`). The wired path uses the **module** one.
- `DeleteClassUseCase` / `DeleteAssignmentUseCase` are built in the DI container but never exposed — there is **no DELETE route** for classes/assignments yet.
- Stray artifacts to remove on sight: `be/null` (0 bytes), `be/test_db.ts`.

---

## 4. Architecture: the target pattern

We use **Clean Architecture**. Dependencies point **inward**; the domain knows nothing about Express or Prisma.

```
   presentation (controller, presenter)      ← HTTP in/out; no business rules
        │  calls
        ▼
   application (use-case, DTO)               ← orchestration: one use-case = one operation
        │  depends on interface
        ▼
   domain (entity, repository INTERFACE, domain service)   ← pure business rules, framework-free
        ▲  implements interface
        │
   infrastructure (Prisma repository)        ← the only layer that imports @prisma/client
```

**Layer rules (enforce in review):**

| Layer | May import | Must NOT import |
|---|---|---|
| `domain` | other domain types, `shared/domain` | Express, Prisma, DTOs, controllers |
| `application` | `domain`, `shared/application` | Express (`req`/`res`), Prisma directly |
| `infrastructure` | `domain` interfaces, Prisma | controllers, use-cases |
| `presentation` | `application` (use-cases, DTOs) | Prisma, `domain` entities raw (return via **presenter**) |

- **Entities** carry behavior + invariants (e.g. `Assignment.publish()` sets status to `PUBLISHED`). Construct via static factories (`Class.create(...)`) / `restore(...)` from persistence.
- **Use-cases** are the unit of business work — one class per operation (`CreateClassUseCase`, `UpdateAssignmentUseCase`). They take a request DTO, call the repo interface + domain service, return a response DTO.
- **Repositories** are defined as **interfaces** in `domain/repositories/*.interface.ts` and implemented with Prisma in `infrastructure/persistence/*`.
- **Presenters** turn entities into the response shape the FE expects — this is where you control the API contract. (Several current bugs are presenter omissions; see [§9](#9-known-bugs--gotchas-to-avoid-repeating).)
- **DI:** everything is hand‑wired in `src/shared/infrastructure/di-container.ts` (a singleton `Map<string,any>`). There is no decorator/reflection DI. New module = new wiring block here.

---

## 5. Auth & security rules

The model is JWT bearer + role gates. **Both middlewares already exist** in `src/middleware/auth.ts` — the bug is that `requireRoles` is never applied.

- `authenticate` — verifies `Authorization: Bearer <jwt>` with `env.JWT_SECRET`, sets `req.user = { id, email, role, fullName }`.
- `requireRoles(...roles)` — must run **after** `authenticate`; 403s if `req.user.role` isn't allowed.

**Rules for every new route:**
1. **Default‑deny.** Every route gets `authenticate` unless it is deliberately public (only `/auth/login`, `/auth/register`, `/health` are public today).
2. **Gate by role.** Admin‑only → `requireRoles('ADMIN')`. Lecturer/admin writes → `requireRoles('LECTURER','ADMIN')`.
3. **Never trust ownership from the body.** Derive `lecturerId` / `authorId` / `studentId` from `req.user.id`, not `req.body`. (The current class/assignment create reads it from the body — don't copy that.)
4. **Roles are UPPERCASE** in the DB and JWT (`ADMIN`/`LECTURER`/`STUDENT`). The FE lowercases at its boundary; the BE keeps uppercase. Don't mix.
5. **Passwords:** bcrypt cost 10; never log or return `passwordHash`. Register enforces ≥8 chars with upper/lower/digit (`auth.domain.service.ts`) — keep that policy for any new password path.
6. **Throw the shared `AppError`** (`shared/application/app.error.ts`) with the right status, so `errorHandler` renders the correct code. Helpers: `NotFoundError`, `ConflictError`, etc.

Example of a correctly‑gated route:
```ts
router.post('/users', authenticate, requireRoles('ADMIN'),
  asyncHandler((req, res) => usersController.create(req, res)))
```

---

## 6. Coding rules & conventions

- **TypeScript ESM:** `"type":"module"`, `NodeNext`. **Import with explicit `.js` specifiers** (`import { X } from './x.js'`) even though the source is `.ts` — required by NodeNext.
- **Strictness:** `noUnusedLocals` + `noUnusedParameters` are on. No dead locals/imports — they fail `tsc`. Prefix intentionally‑unused params with `_`.
- **Naming:** files kebab‑case with a role suffix — `*.controller.ts`, `*.use-case.ts`, `*.repository.ts`, `*.repository.interface.ts`, `*.entity.ts`, `*.dtos.ts`, `*.presenter.ts`, `*.domain.service.ts`.
- **Response envelope:** success → `ok(res, data, status?)` → `{ success: true, data }` (`utils/response.ts`). Errors are produced only by `errorHandler` → `{ success:false, error:{ code, message, details? } }`. Don't hand‑roll `res.json` shapes.
- **Validation:** validate input with **Zod at the controller boundary** before building a DTO. (Today the wired **module** controllers — auth/classes/assignments — skip this; the legacy `UsersController` *does* validate via `createUserSchema`/`updateUserSchema`. Closing the gap on the module controllers is [Risk #8](../docs/CODEBASE_REVIEW.md#4-top-risks-confirmed-criticalhigh-prioritized). New code must not repeat the omission.)
- **Async:** wrap every handler in `asyncHandler(...)` so rejected promises reach `errorHandler`.
- **Prisma:** access via the singleton in `database/prisma.ts`. Use `prisma.$transaction` for multi‑write/find‑then‑create operations (register and class‑code create currently have a TOCTOU race). Translate `P2002` (unique) → 409 and `P2003` (FK) → 400/404 rather than letting them 500.
- **Pagination:** list endpoints must accept `?page`/`?limit` and pass them to the repo (the module repos already accept `limit`/`offset`; the use‑cases just don't pass them yet).
- **IDs:** prefer the DB default `cuid()`. Don't introduce new id schemes (the app currently mixes `cuid()` for seed and `uuidv4()` for app‑created rows — converging on `cuid()` is the goal).
- **No secrets in code.** Everything sensitive comes from `env` (`config/env.ts`).

---

## 7. How to add a new domain module (the golden path)

Suppose you're adding **`submissions`** (a real Phase‑1 task — it exists only as orphaned legacy code today). Build it as a Clean‑Architecture module:

1. **Domain** — `src/modules/submissions/domain/`
   - `entities/submission.entity.ts` — the `Submission` aggregate with behavior (`submit()`, `gradeByAI(score, feedback)`, `publishGrade()`), invariants, and a `restore(...)` factory that **reads `status` from the row** (don't hardcode it — that's the bug in `assignments`).
   - `repositories/submission.repository.interface.ts` — the methods the use‑cases need.
   - `services/submission.domain.service.ts` — cross‑entity rules (e.g. one submission per `(assignment, student)`).
2. **Application** — `src/modules/submissions/application/`
   - `dtos/submission.dtos.ts` — request + response DTOs.
   - `use-cases/{submit, grade, publish-grade, list}.use-case.ts` — one per operation.
3. **Infrastructure** — `src/modules/submissions/infrastructure/persistence/submission.repository.ts` — implements the interface with Prisma.
4. **Presentation** — `src/modules/submissions/presentation/`
   - `controllers/submission.controller.ts` — parse + **Zod‑validate** `req.body`, derive `studentId` from `req.user`, call the use‑case, respond with `ok(...)`.
   - `presenters/submission.presenter.ts` — entity → the exact shape `FE/src/lib/api.ts` expects (cross‑check `FE/CONTRIBUTING.md`).
5. **Wire it** in `src/shared/infrastructure/di-container.ts`: instantiate repo → domain service → use‑cases → controller, and `this.services.set('SubmissionController', controller)`.
6. **Route it** in `src/routes/index.ts` with `authenticate` + the right `requireRoles`, matching the **method and path** the FE calls (mind PUT vs PATCH — see [Risk #9](../docs/CODEBASE_REVIEW.md#4-top-risks-confirmed-criticalhigh-prioritized)).
7. **Update docs:** add the new endpoints to [§2](#2-what-actually-runs-today-read-this-first) of this file (the CLAUDE.md rule will remind you).
8. **Verify:** `npm run build` is green, then hit the endpoint with a seeded token.

> Reuse the **legacy** `controllers/submissions.controller.ts` + `services/submissions.service.ts` as a **behavior reference** (they encode the real rules) — but port the logic into the module; don't import or extend them.

---

## 8. Environment variables (`src/config/env.ts`)

Source of truth: `src/config/env.ts` (parsed/validated with Zod at startup).

| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | **yes** (no default) | `.env.example` ships `file:./dev.db` | SQLite file; Postgres later (Phase 3) |
| `JWT_SECRET` | **yes** (min 16 chars) | ⚠️ guessable default in `.env.example` | **Set a real ≥32‑char secret.** Forgeable tokens if leaked. |
| `JWT_EXPIRES_IN` | no | `7d` | token lifetime |
| `PORT` | no | `3001` | FE dev proxy expects `3001` |
| `NODE_ENV` | no | `development` | non‑prod leaks `String(err)` in errors |
| `CORS_ORIGIN` | no | `http://localhost:5173` | set to the FE origin in prod; accepts `*` or a comma‑separated list. The dev origins (`5173`/`5174`/`3000`/`8081`) are always allowed on top of it |
| `AI_ENDPOINT` | no | `http://localhost:8000` | base URL of the Python service |
| `AI_STUB_MODE` | no | **ON when unset** | real Gemini only when explicitly `false` |

---

## 9. Known bugs & gotchas to avoid repeating

These are confirmed in [`docs/CODEBASE_REVIEW.md`](../docs/CODEBASE_REVIEW.md). When you touch the relevant area, fix rather than mirror them:

- **Assignment status never persists** — `modules/assignments/.../assignment.repository.ts` hardcodes `'DRAFT'` in `restore()` and omits `status` from `update()`. Any new repository must round‑trip `status`.
- **`toggleLock` writes `'BANNED'`** which isn't in the `UserStatus` enum → runtime Prisma error. Decide `BANNED` vs `INACTIVE` and align entity + service + schema + FE.
- **Auth errors → 500** because middleware throws the legacy `AppError`. Throw the shared one.
- **No Zod on the wired module routes** (auth/classes/assignments) — they build DTOs from raw `req.body`. (The legacy `UsersController` does validate.) Validate first.
- **Update‑user drops fields** — `updateUserSchema` only allows `{fullName,status,externalId}`, silently stripping `email`/`role`/`password`. Expand the schema (and hash passwords) or disable those fields.
- **Domain events are inert** — entities emit `domainEvents` but nothing dispatches them. Don't rely on them until a dispatcher exists.

---

## 10. Keeping this doc current

This file is **auto‑maintained** per the root [`CLAUDE.md`](../CLAUDE.md) policy. Update it **in the same change** when you:

- add/remove/modify a route in `src/routes/index.ts` → update the [§2](#2-what-actually-runs-today-read-this-first) endpoint table and the wired/orphaned list;
- add a `modules/*` domain or change a layer boundary → update [§3](#3-directory-structure)/[§4](#4-architecture-the-target-pattern);
- change `src/config/env.ts` → update [§8](#8-environment-variables-srcconfigenvts);
- fix one of the [§9](#9-known-bugs--gotchas-to-avoid-repeating) bugs → remove it from the list.

Then bump **"Last verified"** in the header to the current date.
