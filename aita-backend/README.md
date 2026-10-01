# AITA Backend (`aita-backend/`)

API Node.js cho frontend `aita-fontend/`.

## Chạy nhanh

```bash
cd aita-backend
cp .env.example .env   # nếu chưa có .env
npm install
npm run setup        # prisma + seed
npm run dev          # http://localhost:3001
```

## Tài khoản demo

| Email | Mật khẩu | Cổng FE |
|-------|----------|---------|
| admin@fpt.edu.vn | admin123 | /admin |
| lecturer@fpt.edu.vn | lecturer123 | /lecturer |
| student@fpt.edu.vn | student123 | /student |

## FE kết nối

Trong thư mục `aita-fontend`:

```bash
npm run dev   # proxy /api → localhost:3001
```

Đăng nhập tại `/login` trước khi vào dashboard.

## Các lệnh kiểm tra & vận hành

| Lệnh | Mục đích |
|---|---|
| `npm run build` | Biên dịch toàn bộ TypeScript backend (`tsc`) |
| `npm run dev` | Chạy dev server với hot reload qua `tsx watch` |
| `npm run start` | Khởi chạy server production (`node dist/server.js`) |
| `npm run db:generate` | Sinh Prisma client types |
| `npm run db:push` | Đồng bộ schema Prisma vào database |
| `npm run db:seed` | Nạp dữ liệu mẫu ban đầu |

## CI/CD Pipeline

Dự án đã được tích hợp sẵn trong GitHub Actions tại `.github/workflows/ci.yml`:
- **Job `backend-ci`**: Tự động checkout code, cài đặt dependencies với npm cache, chạy `prisma generate` và `npm run build` kiểm tra typecheck.
- **Job `docker-build`**: Tự động kiểm tra build Docker Image của `aita-backend`.

## Kiến trúc API & Routing

Hệ thống backend được thiết kế theo **Clean Architecture**:
- Khởi động app: `src/app.ts` & `src/server.ts`.
- Quản lý định tuyến toàn bộ modules: `src/shared/presentation/route-manager.ts`.
- Tất cả endpoint đều nằm dưới prefix `/api`.

