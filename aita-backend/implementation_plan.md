# Refactor AITA Backend — Senior-Level Clean Architecture

## Tóm tắt vấn đề

Hiện tại codebase có **2 lớp kiến trúc song song**:
1. **Clean Architecture** (chỉ module `auth`): có đầy đủ 4 layer (Presentation → Application → Domain → Infrastructure)
2. **Legacy** (~10 modules khác): controller → service → repository kiểu flat, `any` typing, `console.log`, không DTO, response format không đồng nhất (`{ success: true, data }` vs `ApiResponse`)

Kế hoạch này sẽ migrate toàn bộ legacy code sang Clean Architecture chuẩn, đồng thời nâng cấp/sửa những phần đã có nhưng chưa hoàn chỉnh.

---

## User Review Required

> [!IMPORTANT]
> **Scope rất lớn**: Kế hoạch này thay đổi ~80+ files. Tôi sẽ chia thành **3 phase** để dễ review. Bạn có muốn tôi thực hiện từng phase và review hay làm toàn bộ 1 lần?

> [!WARNING]
> **Legacy `src/controllers/`, `src/services/`, `src/repositories/`, `src/validations/`, `src/routes/index.ts`** sẽ bị **XÓA** sau khi migrate xong. Code trong `src/utils/response.ts`, `src/utils/asyncHandler.ts` (bản cũ duplicate) cũng sẽ bị loại bỏ.

> [!IMPORTANT]
> **Response format cũ** `{ success: true, data }` sẽ bị thay thế hoàn toàn bằng `ApiResponse{ statusCode, Message, Data }`. FE sẽ cần cập nhật nếu đang parse theo format cũ. Bạn xác nhận FE đã sẵn sàng?

---

## Open Questions

1. **FE hiện đang parse response theo format nào?** — Nếu FE đang dùng `{ success, data }` thì cần chuyển FE sang `{ statusCode, Message, Data }` song song.
2. **Có cần giữ backward-compatible 1 thời gian không?** — Hay chuyển 1 lần dứt khoát?
3. **Module AI**: Hiện đang gọi trực tiếp `prisma` trong controller. Có muốn tách thành `AiModule` riêng không, hay chỉ chuyển sang service-level clean code?

---

## Proposed Changes

### Phase 1: Shared Infrastructure & Foundation

Nâng cấp tất cả shared components trước khi migrate modules.

---

#### [MODIFY] [api-response.ts](file:///c:/Users/Admin/AITA/be/src/shared/presentation/api-response.ts)
- Thêm `success` boolean getter (derived từ statusCode)
- Thêm `timestamp` field
- Thêm `pagination()` static helper cho list responses
- Thêm generic type constraints chặt hơn (không dùng `any`)

#### [MODIFY] [logger.ts](file:///c:/Users/Admin/AITA/be/src/shared/infrastructure/logger.ts)
- Thêm **correlation ID** (request-scoped) để trace request qua nhiều layers
- Thêm **structured JSON output** cho production mode
- Thêm `elapsed time` tracking cho performance debug
- Di chuyển `ILogger` interface sang `shared/application/ports/logger.interface.ts` (tách interface khỏi implementation)

#### [NEW] `src/shared/application/ports/logger.interface.ts`
- Interface `ILogger` tách ra từ logger.ts
- Cho phép swap implementation (console, file, external service)

#### [MODIFY] [prisma-unit-of-work.ts](file:///c:/Users/Admin/AITA/be/src/shared/infrastructure/prisma-unit-of-work.ts)
- Thay `client: any` → `client: PrismaClient | Prisma.TransactionClient` (type-safe)
- Mở rộng thêm repositories cho các module mới: `classRepository`, `examRepository`, `submissionRepository`, `subjectRepository`, `notificationRepository`
- Thêm **timeout** cho transaction (configurable)
- Thêm logging cho transaction lifecycle

#### [MODIFY] [unit-of-work.interface.ts](file:///c:/Users/Admin/AITA/be/src/shared/application/ports/unit-of-work.interface.ts)
- Mở rộng interface thêm repository getters cho tất cả modules

#### [MODIFY] [app.error.ts](file:///c:/Users/Admin/AITA/be/src/shared/application/app.error.ts)
- Thêm `TooManyRequestsError (429)`
- Thêm `ServiceUnavailableError (503)`
- Thêm error serialization (`toJSON()`) cho logging

#### [MODIFY] [errorHandler.ts](file:///c:/Users/Admin/AITA/be/src/middleware/errorHandler.ts)
- Thêm **request ID** trong error response
- Thêm **stack trace** chỉ trong development mode
- Log full error context (method, url, user, body) cho debug
- Handle `JsonWebTokenError`, `TokenExpiredError` riêng
- Handle Prisma errors (unique constraint, not found, etc.)

#### [MODIFY] [auth.ts](file:///c:/Users/Admin/AITA/be/src/middleware/auth.ts) (middleware)
- Thêm logging khi authenticate thành công/thất bại
- Type-safe `JwtPayload` thay vì cast

#### [MODIFY] [request-logger.ts](file:///c:/Users/Admin/AITA/be/src/middleware/request-logger.ts)
- Thêm **request ID** generation (UUID) và gắn vào `req`
- Mask sensitive data (password, token) trong log
- Loại bỏ duplicate với morgan (chọn 1 giải pháp)

#### [NEW] `src/middleware/rate-limiter.ts`
- Simple in-memory rate limiter middleware
- Configurable per-route limits

#### [NEW] `src/middleware/request-id.ts`
- Generate unique request ID cho mỗi request
- Gắn vào response header `X-Request-Id`

#### [MODIFY] [async-handler.ts](file:///c:/Users/Admin/AITA/be/src/utils/async-handler.ts)
- Thêm proper TypeScript generics
- Loại bỏ file duplicate `asyncHandler.ts`

#### [DELETE] `src/utils/asyncHandler.ts` — duplicate file
#### [DELETE] `src/utils/response.ts` — thay bằng `ApiResponse`
#### [DELETE] `src/utils/errors.ts` — merge vào `app.error.ts`

#### [MODIFY] [env.ts](file:///c:/Users/Admin/AITA/be/src/config/env.ts)
- Thêm `LOG_LEVEL` config
- Thêm `RATE_LIMIT_*` config
- Thêm `DB_TRANSACTION_TIMEOUT` config

#### [MODIFY] [di-container.ts](file:///c:/Users/Admin/AITA/be/src/shared/infrastructure/di-container.ts)
- Loại bỏ toàn bộ legacy imports
- Register tất cả use cases và controllers theo Clean Architecture
- Type-safe container với Map generics
- Lazy initialization pattern

#### [MODIFY] [database/prisma.ts](file:///c:/Users/Admin/AITA/be/src/database/prisma.ts)
- Thêm logging cho Prisma queries trong development mode
- Thêm connection health check function

#### [MODIFY] [express.d.ts](file:///c:/Users/Admin/AITA/be/src/types/express.d.ts)
- Thêm `requestId` field vào Request type

---

### Phase 2: Migrate Legacy Modules to Clean Architecture

Mỗi module sẽ có cấu trúc 4 layers:
```
src/modules/<module>/
├── domain/
│   ├── entities/           # Domain entities với business logic
│   ├── repositories/       # Repository interfaces
│   └── enums/              # Module-specific enums (nếu có)
├── application/
│   ├── dtos/               # Request/Response DTOs với Zod validation
│   └── use-cases/          # Business logic use cases
├── infrastructure/
│   └── repositories/       # Prisma repository implementations
└── presentation/
    ├── <module>.controller.ts
    └── <module>.router.ts
```

---

#### Module: Classes

##### [NEW] `src/modules/classes/domain/repositories/class-repository.interface.ts`
##### [NEW] `src/modules/classes/domain/repositories/enrollment-repository.interface.ts`
##### [NEW] `src/modules/classes/application/dtos/class.dto.ts`
- `CreateClassRequestDto` (Zod validation, thay cho `createClassSchema`)
- `EnrollStudentRequestDto`
- `ClassResponseDto`
##### [NEW] `src/modules/classes/application/use-cases/list-classes.use-case.ts`
##### [NEW] `src/modules/classes/application/use-cases/create-class.use-case.ts`
##### [NEW] `src/modules/classes/application/use-cases/update-class.use-case.ts`
##### [NEW] `src/modules/classes/application/use-cases/delete-class.use-case.ts`
##### [NEW] `src/modules/classes/infrastructure/repositories/prisma-class-repository.ts`
##### [NEW] `src/modules/classes/infrastructure/repositories/prisma-enrollment-repository.ts`
##### [NEW] `src/modules/classes/presentation/classes.controller.ts`
##### [NEW] `src/modules/classes/presentation/classes.router.ts`

---

#### Module: Subjects

##### [NEW] `src/modules/subjects/domain/repositories/subject-repository.interface.ts`
##### [NEW] `src/modules/subjects/application/dtos/subject.dto.ts`
- `CreateSubjectRequestDto`, `UpdateSubjectRequestDto`, `SubjectResponseDto`
##### [NEW] `src/modules/subjects/application/use-cases/list-subjects.use-case.ts`
##### [NEW] `src/modules/subjects/application/use-cases/create-subject.use-case.ts`
##### [NEW] `src/modules/subjects/application/use-cases/update-subject.use-case.ts`
##### [NEW] `src/modules/subjects/application/use-cases/delete-subject.use-case.ts`
##### [NEW] `src/modules/subjects/infrastructure/repositories/prisma-subject-repository.ts`
##### [NEW] `src/modules/subjects/presentation/subjects.controller.ts`
##### [NEW] `src/modules/subjects/presentation/subjects.router.ts`

---

#### Module: Exams (Assignments)

##### [NEW] `src/modules/exams/domain/repositories/exam-repository.interface.ts`
##### [NEW] `src/modules/exams/application/dtos/exam.dto.ts`
##### [NEW] `src/modules/exams/application/use-cases/list-exams.use-case.ts`
##### [NEW] `src/modules/exams/application/use-cases/create-exam.use-case.ts`
##### [NEW] `src/modules/exams/application/use-cases/update-exam.use-case.ts`
##### [NEW] `src/modules/exams/application/use-cases/get-exam.use-case.ts`
##### [NEW] `src/modules/exams/infrastructure/repositories/prisma-exam-repository.ts`
##### [NEW] `src/modules/exams/presentation/exams.controller.ts`
##### [NEW] `src/modules/exams/presentation/exams.router.ts`

---

#### Module: Submissions

##### [NEW] `src/modules/submissions/domain/repositories/submission-repository.interface.ts`
##### [NEW] `src/modules/submissions/application/dtos/submission.dto.ts`
##### [NEW] `src/modules/submissions/application/use-cases/list-submissions.use-case.ts`
##### [NEW] `src/modules/submissions/application/use-cases/submit-assignment.use-case.ts`
##### [NEW] `src/modules/submissions/application/use-cases/get-submission.use-case.ts`
##### [NEW] `src/modules/submissions/application/use-cases/publish-grade.use-case.ts`
##### [NEW] `src/modules/submissions/application/use-cases/recent-submissions.use-case.ts`
##### [NEW] `src/modules/submissions/infrastructure/repositories/prisma-submission-repository.ts`
##### [NEW] `src/modules/submissions/presentation/submissions.controller.ts`
##### [NEW] `src/modules/submissions/presentation/submissions.router.ts`

---

#### Module: Users (Admin Management)

##### [NEW] `src/modules/users/domain/repositories/user-management-repository.interface.ts`
##### [NEW] `src/modules/users/application/dtos/user.dto.ts`
##### [NEW] `src/modules/users/application/use-cases/list-users.use-case.ts`
##### [NEW] `src/modules/users/application/use-cases/create-user.use-case.ts`
##### [NEW] `src/modules/users/application/use-cases/update-user.use-case.ts`
##### [NEW] `src/modules/users/application/use-cases/delete-user.use-case.ts`
##### [NEW] `src/modules/users/application/use-cases/toggle-lock.use-case.ts`
##### [NEW] `src/modules/users/infrastructure/repositories/prisma-user-management-repository.ts`
##### [NEW] `src/modules/users/presentation/users.controller.ts`
##### [NEW] `src/modules/users/presentation/users.router.ts`

---

#### Module: Notifications

##### [NEW] `src/modules/notifications/domain/repositories/notification-repository.interface.ts`
##### [NEW] `src/modules/notifications/application/dtos/notification.dto.ts`
##### [NEW] `src/modules/notifications/application/use-cases/list-notifications.use-case.ts`
##### [NEW] `src/modules/notifications/application/use-cases/create-notification.use-case.ts`
##### [NEW] `src/modules/notifications/application/use-cases/mark-read.use-case.ts`
##### [NEW] `src/modules/notifications/infrastructure/repositories/prisma-notification-repository.ts`
##### [NEW] `src/modules/notifications/presentation/notifications.controller.ts`
##### [NEW] `src/modules/notifications/presentation/notifications.router.ts`

---

#### Module: Stats (Dashboard)

##### [NEW] `src/modules/stats/application/dtos/stats.dto.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-overview.use-case.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-activity-logs.use-case.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-student-history.use-case.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-student-progress.use-case.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-lecturer-report.use-case.ts`
##### [NEW] `src/modules/stats/application/use-cases/get-student-feedback.use-case.ts`
##### [NEW] `src/modules/stats/presentation/stats.controller.ts`
##### [NEW] `src/modules/stats/presentation/stats.router.ts`

---

#### Module: Config (Settings + Reports + Options)

##### [NEW] `src/modules/config/application/dtos/config.dto.ts`
##### [NEW] `src/modules/config/application/use-cases/get-settings.use-case.ts`
##### [NEW] `src/modules/config/application/use-cases/update-settings.use-case.ts`
##### [NEW] `src/modules/config/application/use-cases/get-admin-report.use-case.ts`
##### [NEW] `src/modules/config/application/use-cases/get-system-health.use-case.ts`
##### [NEW] `src/modules/config/application/use-cases/get-options.use-case.ts`
##### [NEW] `src/modules/config/infrastructure/repositories/prisma-config-repository.ts`
##### [NEW] `src/modules/config/presentation/config.controller.ts`
##### [NEW] `src/modules/config/presentation/config.router.ts`

---

#### Module: AI

##### [NEW] `src/modules/ai/application/dtos/ai.dto.ts`
##### [NEW] `src/modules/ai/application/use-cases/generate-exercise.use-case.ts`
##### [NEW] `src/modules/ai/application/use-cases/save-ai-assignment.use-case.ts`
##### [NEW] `src/modules/ai/application/use-cases/assess-submission.use-case.ts`
##### [NEW] `src/modules/ai/application/use-cases/learning-feedback.use-case.ts`
##### [NEW] `src/modules/ai/application/use-cases/manage-ai-config.use-case.ts`
##### [NEW] `src/modules/ai/application/ports/ai-service.interface.ts`
##### [NEW] `src/modules/ai/infrastructure/ai-service.ts` (moved & refactored from `src/services/ai.service.ts`)
##### [NEW] `src/modules/ai/presentation/ai.controller.ts`
##### [NEW] `src/modules/ai/presentation/ai.router.ts`

---

### Phase 3: Cleanup & Integration


#### [MODIFY] [route-manager.ts](file:///c:/Users/Admin/AITA/be/src/shared/presentation/route-manager.ts)
- Loại bỏ tất cả legacy routes
- Import routers từ các modules mới
- Thêm route listing helper (print all registered routes on startup)
- Centralized prefix management

#### [MODIFY] [app.ts](file:///c:/Users/Admin/AITA/be/src/app.ts)
- Thêm `request-id` middleware
- Loại bỏ duplicate morgan + custom logger (chọn 1)
- Thêm graceful shutdown handling

#### [MODIFY] [server.ts](file:///c:/Users/Admin/AITA/be/src/server.ts)
- Sử dụng Logger thay console.log
- Thêm startup diagnostics (DB connection, env validation)
- Graceful shutdown

#### [DELETE] Toàn bộ legacy files:
- `src/controllers/` (12 files)
- `src/services/` (8 files)
- `src/repositories/` (7 files)
- `src/validations/` (5 files)
- `src/routes/index.ts`
- `src/utils/response.ts`
- `src/utils/asyncHandler.ts`
- `src/utils/user.ts`

#### [MODIFY] [mappers.ts](file:///c:/Users/Admin/AITA/be/src/utils/mappers.ts)
- Di chuyển mapping logic vào từng module's ResponseDto
- File này sẽ bị xóa sau khi migrate xong

---

## Kỹ thuật chuyên nghiệp bổ sung

| Kỹ thuật | Mô tả |
|---|---|
| **Request ID Correlation** | Mỗi request có UUID duy nhất, truyền qua tất cả layers để trace logs |
| **DTO Auto-mapping** | ResponseDto có static `from()` factory method, tránh manual mapping |
| **Repository Pattern** | Interface trong domain, implementation trong infrastructure |
| **Guard Clauses** | Early return pattern thay vì nested if-else |
| **Barrel Exports** | `index.ts` cho mỗi layer để gọn import paths |
| **Error Hierarchy** | AppError → domain-specific errors, tự map sang HTTP status |
| **Transaction Awareness** | UoW detect nested transaction, tránh double-wrap |
| **Prisma Error Translation** | Map Prisma errors (P2002, P2025) sang AppError |

---

## Verification Plan

### Automated Tests
```bash
# Build check (no TypeScript errors)
npx tsc --noEmit

# Start dev server
npm run dev
```

### Manual Verification
- Gọi thử tất cả API endpoints qua browser/Postman
- Kiểm tra response format thống nhất `{ statusCode, Message, Data }`
- Kiểm tra error response format
- Kiểm tra logs có request ID, context đầy đủ
- Kiểm tra transaction rollback khi có lỗi
