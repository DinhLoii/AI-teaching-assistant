# Tổ chức source code aita-fontend

## Mục tiêu

Tách routing khỏi màn hình, UI dùng chung khỏi nghiệp vụ, chia API theo domain
và giữ phụ thuộc đi một chiều. Cách tổ chức tham khảo pages/features/store/lib
của FE và điều chỉnh theo Next.js App Router.

Cấu trúc thư mục là nền tảng bảo trì; nghiệm thu nghiệp vụ, bảo mật, cấu hình
triển khai và E2E vẫn tiếp tục theo kế hoạch G0–G7.

## Trách nhiệm

| Vị trí | Nội dung và quy tắc |
|---|---|
| `src/app` | Route entry, layout, metadata, file convention Next khi cần. Page chọn screen; không đặt form/API hàng trăm dòng tại route. |
| `src/features/<domain>/screens` | Màn hình theo nghiệp vụ, tên rõ role/mục đích. Ghép UI/state và gọi domain API. |
| `src/features/<domain>/components` | UI đặc thù nghiệp vụ; report viewer thuộc submissions, không thuộc UI primitives. |
| `src/features/<domain>/hooks` | Logic/state riêng nghiệp vụ như notes. Chỉ tạo khi cần, không tạo thư mục rỗng. |
| `src/components/ui` | UI primitives nhận props/callback; không import API, provider hay feature. |
| `src/components/layout` | Dashboard shell; có thể compose provider/widget như LiveClock. |
| `src/components/i18n` | Bộ chọn ngôn ngữ; không chứa dictionary. |
| `src/providers` | Context xuyên điều hướng và AppProviders; không import screen/route. |
| `src/lib/api` | Transport, token storage, DTO và endpoint adapter; không phụ thuộc React/provider/UI. |
| `src/lib/events` | Đồng bộ event giữa component/tab. |
| `src/lib/i18n/locales` | Dictionary `vi.ts`, `en.ts`; giữ key và fallback hiện tại. |
| `src/config` | Navigation/cấu hình dùng chung, không chứa state React. |
| `src/types` | UI/grading types dùng chung; DTO backend ở `lib/api/contracts.ts`, view model riêng ở feature khi phát sinh. |
| `src/styles` | Global CSS/theme/Tailwind; root layout import stylesheet. |
| `scripts`, `tests`, `docs` | Tooling, test và tài liệu; không được import bởi ứng dụng. |

## Feature và import

Các domain: `assignments`, `audit`, `auth`, `classes`, `dashboard`, `exams`,
`home`, `notes`, `notifications`, `profile`, `prompts`, `reports`, `settings`,
`subjects`, `submissions`.

Nhóm theo nghiệp vụ để ba vai trò tái dùng logic trong cùng domain. Route vẫn
chia role. Không gộp hai màn hình chỉ vì bảng giống nhau nếu quyền/hành vi khác.

```text
src/app/admin/users/page.tsx
  → src/features/users/screens/AdminUsersPage.tsx
    → src/lib/api/modules/users.ts
      → src/lib/api/client.ts

src/app/student/grading/result/[id]/page.tsx
  → src/features/submissions/screens/StudentResultPage.tsx
    → src/features/submissions/components/EvaluationReportViewer.tsx
```

- `@/*` chỉ tới `src/*`; config, `.env.*`, `public` vẫn ở root.
- Feature/component/provider/lib không import `app`.
- `lib`, `types`, `config` không phụ thuộc `features`, `components`, `providers`.
- Providers không phụ thuộc screen/component; compose tại `AppProviders`.
- UI primitives không biết backend/role; business action truyền qua props.
- Shared layout được compose provider và feature widget. Cross-feature import
  chỉ dùng component/hook cần chung; không import screen khác để tái dùng logic.
- Dùng `import type` khi chỉ cần type; import module trực tiếp để ranh giới
  client/server rõ. Không tạo barrel export toàn bộ screen/provider.

ESLint kiểm tra alias boundaries. `npm run check:structure` kiểm tra thêm
relative imports, runtime dependency cycle, unresolved import và route map.

## API client

```text
src/lib/api/
├── client.ts              # request(), ApiError, refresh queue, response envelope
├── storage.ts             # AUTH_STORAGE_KEYS, local/session storage
├── contracts.ts           # Request/response DTOs hiện có
├── normalizers/
│   └── submission.ts      # Normalize bài nộp tại một nơi
├── modules/               # 17 module: auth, users, classes, subjects, semesters,
│                          # assignments, exams, submissions, student-portal,
│                          # grading, rubric, prompts, ai, settings,
│                          # notifications, reports, audit
└── index.ts               # Compatibility facade cho API cũ
```

Screen đã chuyển và code mới import domain client trực tiếp:

```ts
import { usersApi } from '@/lib/api/modules/users'
import type { CreateUserBody } from '@/lib/api/contracts'
```

Facade `api`, `gradingApi`, `aiApi` giữ để hỗ trợ port logic từ FE và kiểm chứng
tương thích. Thêm endpoint vào domain module, không thêm vào facade. Các kiểm tra
chặn screen/provider/UI import facade để tránh quay lại API object khổng lồ.

`assignmentsApi` và `gradingApi` có endpoint khác nhau; chia file giữ nguyên hợp
đồng hiện tại, không có nghĩa hai nhóm dùng thay nhau. Payload/type `any` chưa
chính xác vẫn là backlog G0/G1.

Transport/storage dùng browser token như trước. Khi Server Component cần gọi
backend có xác thực, thiết kế server client theo cơ chế auth phù hợp; không
giả định localStorage tồn tại trên server.

## Routing và providers

- Route entry là Server Component nhỏ render client screen. Screen dùng hook
  giữ `'use client'`; browser globals không được đưa vào root server layout.
- Metadata, font, HTML/body/global CSS thuộc `src/app/layout.tsx`.
- `AppProviders` giữ thứ tự Theme → Language → Auth → Notification.
- `DashboardLayout` vẫn được gọi trong từng screen để giữ header/guard hiện tại.
  Khi chuyển sang nested layouts phải bỏ wrapper cũ cùng đợt, tránh hai sidebar
  và kiểm tra lại lifecycle/header theo route.
- Guard frontend là UI guard; backend tiếp tục phải kiểm tra quyền.
- Chưa thêm route thiếu trong audit. `docs/route-map.json` mô tả 28 route hiện có;
  cập nhật file khi thêm route.

## Đường dẫn cũ → mới

| Cũ | Mới |
|---|---|
| `app/**/page.tsx` | Route tại `src/app/**/page.tsx`; nội dung tại `src/features/*/screens/*` |
| `app/layout.tsx` | `src/app/layout.tsx` + `src/providers/AppProviders.tsx` |
| `app/globals.css` | `src/styles/globals.css` |
| `components/layout/*` | `src/components/layout/*` |
| UI button/input/card/badge/modal | `src/components/ui/*` |
| `components/ui/LiveClock.tsx` | `src/features/notes/components/LiveClock.tsx` |
| `hooks/useNotes.ts` | `src/features/notes/hooks/useNotes.ts` |
| `components/ui/LanguageDropdown.tsx` | `src/components/i18n/LanguageDropdown.tsx` |
| `components/submission/EvaluationReportViewer.tsx` | `src/features/submissions/components/EvaluationReportViewer.tsx` |
| `lib/*-context.tsx` | `src/providers/*-provider.tsx` |
| `lib/api.ts` | `src/lib/api/{client,storage,contracts,modules,normalizers,index}` |
| `lib/notifications.ts` | `src/lib/events/notifications.ts` |
| Dictionary trong language context | `src/lib/i18n/locales/{vi,en}.ts` |
| `constants/navigation.ts` | `src/config/navigation.ts` |
| `types/index.ts` | `src/types/{ui,grading,index}.ts` |
| Script label/deduplicate, JSON tạm | `scripts/archive/`, giữ tham khảo, chặn chạy nhầm |

## Thêm tính năng

1. Tìm domain/screen qua route map; đọc backend và mục audit liên quan.
2. Thêm/sửa DTO và API trong đúng module. Không gọi fetch rải rác trong JSX.
3. Thêm screen; tách component/hook khi có trách nhiệm rõ, không tạo folder rỗng.
4. Thêm route entry, cập nhật navigation/route map nếu có URL mới.
5. Bổ sung loading/error/empty/success và quyền phù hợp.
6. Chạy structure/typecheck/lint và test có ý nghĩa; test tích hợp backend khi sửa
   mutation. Cập nhật checklist G0–G7 với bằng chứng.

## Phạm vi tái cấu trúc

- Giữ URL 28 trang, thân logic/JSX screen, payload 106 phương thức API chính,
  generation/grading API và dữ liệu bản dịch hiện tại.
- Một điều chỉnh framework: `gradingApi.getSqlKeyUrl` dùng `BASE` chung của
  Next.js thay cho `import.meta.env.VITE_API_URL` còn sót từ Vite.
- Đã đối chiếu nguồn trước/sau để xác nhận logic screen, endpoint body và
  dictionary được giữ nguyên, ngoại trừ SQL URL nêu trên.
- Hàm lớn trong screen, lint debt và lỗi nghiệp vụ đã nằm đúng module để xử lý
  tiếp, chưa được coi là đã sửa trong đợt tổ chức source này.
