# AITA — aita-fontend

Frontend mới của AI Teaching Assistant, dùng Next.js App Router, React,
TypeScript và Tailwind CSS. Source được tổ chức theo nghiệp vụ để tiếp tục
hoàn thiện chức năng từ FE cũ.

## Chạy cục bộ

Từ thư mục `aita-fontend`:

```sh
npm ci
npm run dev
```

Ứng dụng chạy tại `http://localhost:5174`. Backend mặc định tại
`http://localhost:3001`; `next.config.ts` chuyển tiếp `/api/*` và `/uploads/*`
đến backend này. Có thể đặt `NEXT_PUBLIC_API_URL` trong `.env.local` để dùng
API origin khác. Biến `NEXT_PUBLIC_*` công khai trong browser, không đặt secret.

Build dùng Google Fonts (Plus Jakarta Sans và JetBrains Mono), cần mạng ở lần
tải font đầu tiên. `npm run start` phục vụ production ở cổng mặc định 3000;
có thể dùng `npm run start -- -p 5174`.

Trên PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

## Cấu trúc

```text
aita-fontend/
├── src/
│   ├── app/                  # Next.js routes, root layout, favicon
│   ├── features/             # Screen/component/hook theo nghiệp vụ
│   ├── components/
│   │   ├── ui/               # Button, Input, Card, Badge, Modal
│   │   ├── layout/           # DashboardLayout, Navbar, Sidebar
│   │   └── i18n/             # Bộ chọn ngôn ngữ
│   ├── providers/            # AppProviders + auth/theme/language/notification
│   ├── config/               # Navigation/cấu hình UI dùng chung
│   ├── lib/
│   │   ├── api/              # HTTP client, storage, DTO, API theo domain
│   │   ├── events/           # Đồng bộ notification giữa component/tab
│   │   ├── i18n/             # Bản dịch vi/en độc lập với React context
│   │   └── utils.ts          # Helpers định dạng và className
│   ├── styles/               # Global CSS/Tailwind/theme
│   └── types/                # UI types và grading contracts
├── public/                   # Static assets
├── scripts/                  # Kiểm tra kiến trúc; archive script cũ
├── tests/                    # API regression tests, không gọi mạng thật
├── docs/                     # Quy ước kiến trúc, bản đồ route → screen
└── *.config.*                # Cấu hình toolchain ở root
```

Hướng dẫn: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Tìm screen theo URL: [docs/route-map.json](docs/route-map.json).
Kết quả kiểm tra đợt tái cấu trúc: [docs/REFACTOR_VERIFICATION.md](docs/REFACTOR_VERIFICATION.md).

## Các lệnh kiểm tra

| Lệnh | Mục đích |
|---|---|
| `npm run check:structure` | Imports, ranh giới tầng, dependency cycle, route map |
| `npm run typecheck` | Tạo Next route types rồi kiểm tra TypeScript |
| `npm test` | Payload, auth refresh, normalization, multipart và API URL |
| `npm run lint` | Next.js/React/TypeScript và quy tắc import |
| `npm run build` | Build production |

Lint còn các lỗi sẵn có ghi trong audit; việc tổ chức lại code không có nghĩa
toàn bộ chức năng hay chất lượng production đã được nghiệm thu. Không tắt rule
để che các lỗi đó. Các test hiện tại bảo vệ việc tách API client, chưa thay thế
E2E ba vai trò với backend thật.

## Tài liệu kiến trúc và xác thực

- [Kiến trúc Frontend](docs/ARCHITECTURE.md)
- [Bản đồ Route](docs/route-map.json)
- [Báo cáo xác thực](docs/REFACTOR_VERIFICATION.md)

