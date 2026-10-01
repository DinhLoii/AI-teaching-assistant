# AITA Frontend (aita-fontend) — Developer Guide

> **Service:** `aita-fontend/` — The production web client for AI-Teaching-Assistant (AITA).
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Lucide React · Node test runner / Vitest.
> **Architecture:** Modular API Client (`src/lib/api/modules/*`) · Feature-driven Screens (`src/features/*`) · Centralized Auth & Theme Contexts.

---

## 1. Quick Start

```bash
cd aita-fontend
npm install
npm run dev
```

- Local Dev URL: `http://localhost:5174` (or `:3000`)
- Backend API Proxy: Automatically proxies `/api/*` and `/uploads/*` to `http://localhost:3001` via `next.config.ts`.
- Default Seed Accounts:
  - Admin: `admin@fpt.edu.vn` / `admin123`
  - Lecturer: `lecturer1@fpt.edu.vn` / `lecturer123`
  - Student: `student1@fpt.edu.vn` / `student123`

### Scripts Reference

| Script | Purpose |
|---|---|
| `npm run dev` | Starts Next.js Turbopack dev server on port 5174 |
| `npm run build` | Next.js production build (`next build`) |
| `npm run start` | Run production Next.js server (`next start`) |
| `npm run lint` | ESLint check |
| `npm run typecheck` | Next.js type generation + TypeScript check (`next typegen && tsc --noEmit`) |
| `npm run check:structure` | Strict repository contract & structure verification (`scripts/check-structure.mjs`) |
| `npm test` | Automated unit & contract tests |
| `npm run check:all` | Comprehensive validation gate (structure + tests + typecheck + build) |

---

## 2. Directory Structure

```
aita-fontend/
├── docs/
│   ├── ARCHITECTURE.md          # Comprehensive frontend architecture specification
│   ├── REFACTOR_VERIFICATION.md # Audit & migration verification report
│   └── route-map.json           # Canonical route registry verified against App Router
├── public/                      # Static assets (images, logos, favicon)
├── scripts/
│   └── check-structure.mjs      # CI/Dev script enforcing route, API, and component contracts
├── tests/                       # Automated tests (module tests, API client tests)
├── src/
│   ├── app/                     # Next.js 16 App Router
│   │   ├── (auth)/              # Login, register, forgot-password route groups
│   │   ├── (dashboard)/         # Protected role portals:
│   │   │   ├── admin/           # Admin portal (dashboard, users, classes, subjects, system, audits...)
│   │   │   ├── lecturer/        # Lecturer portal (classes, assignments, grading hub, rubrics, questions...)
│   │   │   └── student/         # Student portal (classes, assignments, submissions, feedback, history...)
│   │   ├── layout.tsx           # Root HTML layout with providers (Auth, Language, Theme)
│   │   └── page.tsx             # Public landing page
│   ├── components/
│   │   ├── common/              # Shared feedback (ErrorBoundary, LoadingSpinner, EmptyState)
│   │   ├── ui/                  # Design system primitives (Button, Card, Input, Modal, Badge, DataTable)
│   │   └── icons/               # Icon mapping utilities
│   ├── features/                # Role-specific and domain screens:
│   │   ├── admin/screens/       # Admin page implementations
│   │   ├── lecturer/screens/    # Lecturer page implementations
│   │   ├── student/screens/     # Student page implementations
│   │   └── public/screens/      # Marketing and public pages
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts        # Core typed HTTP fetch client with JWT interceptor & envelope unwrapping
│   │       └── modules/         # Modular endpoint clients (auth, users, classes, assignments, submissions, etc.)
│   ├── store/                   # Global state providers:
│   │   ├── AuthContext.tsx      # Authentication state, login/logout, role permissions
│   │   ├── LanguageContext.tsx  # Multi-language dictionary provider (vi/en)
│   │   └── ThemeContext.tsx     # Light/Dark mode state
│   └── styles/
│       └── globals.css          # Tailwind CSS 4 theme rules and base tokens
├── Dockerfile                   # Multi-stage production container build (deps -> builder -> runner)
├── nginx.conf                   # Production Nginx reverse-proxy config with SSE and cache optimization
└── next.config.ts               # Next.js configuration, rewrites, and redirects
```

---

## 3. Data Fetching & API Architecture

- **HTTP Client:** All network calls flow through `src/lib/api/modules/*.ts`, which use `src/lib/api/client.ts`.
- **Envelope Handling:** Backend responses follow `{ success: true, data: T, message?: string }`. The client unwraps the payload and delivers `T` directly to components.
- **Authentication:** JWT tokens are persisted in `localStorage` under `aita_token` and automatically appended as `Authorization: Bearer <token>` on all requests.
- **Error Handling:** HTTP 401 triggers an auth reset and redirects to `/login`. Business logic errors throw structured `ApiClientError` with response details.

---

## 4. Multi-Language Support (i18n)

- Language preference is toggled via `useLanguage()` from `src/store/LanguageContext.tsx`.
- Supports Vietnamese (`vi`, default) and English (`en`).
- Dictionary keys are type-safe and stored in `src/store/LanguageContext.tsx` or `src/locales/`.

---

## 5. Adding New Routes or Features

1. **Verify Backend API:** Check `aita-backend/src/routes/` to ensure the required endpoint is implemented and documented.
2. **Add API Module Method:** Add typed request and response methods to the relevant file in `src/lib/api/modules/`.
3. **Build the Feature Screen:** Create the UI component under `src/features/<role>/screens/<FeatureName>Screen.tsx`.
4. **Wire the App Router Page:** Add the corresponding `src/app/(dashboard)/<role>/<path>/page.tsx`.
5. **Update Route Registry:** Update `docs/route-map.json` to register the new route and screen mapping.
6. **Run Verification:** Run `npm run check:structure && npm test && npm run build` to ensure the codebase remains 100% healthy.
