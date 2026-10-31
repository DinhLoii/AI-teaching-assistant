# Đánh giá sẵn sàng production — AITA

> Đây là báo cáo **trước sửa**, được giữ làm bằng chứng lịch sử. Kết quả hiện tại nằm trong [báo cáo sau sửa](PRODUCTION_FIXES_REPORT_2026-10-31.md).

Ngày 31/10/2026 · Mục tiêu dự kiến: frontend Vercel, backend Render.

**Kết luận: CHƯA SẴN SÀNG mở production công khai.** Có 2 phát hiện P0, 10 P1 và 4 P2 trong phạm vi rà soát này. Build/test đạt không bù được các lỗi quyền, tài khoản demo và thực thi AI ngoài sandbox. Chưa có deployment Vercel/Render nên báo cáo không chứng nhận cấu hình hay độ ổn định của dịch vụ chưa được tạo.

## Phạm vi và cách đánh giá

Rà cấu trúc 19 module backend, inventory 469 file TS backend và 194 khai báo route, 57 route frontend; đối chiếu quyền, xác thực, dữ liệu, grading/RAG, lưu trữ, migration, cấu hình build/Docker/CI và giới hạn Vercel/Render. Inventory không đồng nghĩa từng dòng trong 469 file đã được kiểm chứng động. Mốc Git là HEAD 579c9df cùng working tree có thay đổi bảng điểm từ lượt trước.

Lượt này **chỉ đánh giá**: không sửa mã ứng dụng, không deploy, không migrate hay đổi điểm/mật khẩu trên database hệ thống. Các probe ghi dùng fixture hoặc PostgreSQL tạm; container database tạm đã được dọn. Chỉ đọc database hiện tại để đối chiếu schema/migration và hash tài khoản demo; không đưa mật khẩu/token/bí mật vào báo cáo.

## Các kiểm chứng đã đạt và giới hạn

- Frontend unit/contract: 113 đạt, 1 bỏ qua; backend: 88 đạt, 4 bỏ qua, từ cùng working tree hiện tại.
- Browser: 19/20 bộ hiện có đạt. Bộ không đạt: system-refresh.browser.cjs. Log được giữ nguyên, không bỏ test để làm xanh.
- PostgreSQL cô lập: 8/8 kiểm thử queue/retry/cancel/lease/realtime đạt. Dùng PostgreSQL tạm không có pgvector; chưa kiểm chứng embedding/vector trên DB tạm.
- Chấm C++ Docker thật: đạt các trường hợp stdout/stderr, sai khoảng trắng, nonzero exit và lỗi biên dịch. Không suy ra mọi runtime Java/.NET/SQL/Android đều đã nghiệm thu.
- Bảng điểm: kiểm chứng thêm bằng Prisma + PostgreSQL thật trong schema tạm: Decimal/revision, điểm 0, weighted total, audit/thông báo, 409, bulk rollback và trọng số riêng lớp đều đạt.
- Bộ local runtime: 3/3 đạt. Typecheck, cấu trúc frontend, build backend và build frontend Webpack đạt. Prisma schema validate đạt.
- Lint source frontend: 0 lỗi, 1.027 cảnh báo. Lint toàn cây thất bại do quét build output; chi tiết F15.
- 7 probe cô lập xác nhận các hành vi rủi ro; “probe hoàn tất” không có nghĩa hệ thống an toàn.

Kết quả test hiện có đã bỏ lọt một số API AI thay thế và truy cập chéo lớp; các probe bổ sung xác nhận điều đó. Không bảo đảm đã tìm hết mọi bug, chưa kiểm thử tải production, restore backup, chất lượng điểm AI thật, chi phí/quota mô hình hoặc deployment Linux/Vercel/Render.

## Phát hiện theo mức ưu tiên

### F01 · P0 — Database hiện tại còn tài khoản demo với mật khẩu mẫu

**Bằng chứng:** Đã đối chiếu hash chỉ đọc.

Cả 6 tài khoản demo tìm thấy vẫn dùng mật khẩu mẫu công khai trong dev-seed: 2 admin, 2 giảng viên, 2 sinh viên. Tất cả đang active và không bắt buộc đổi mật khẩu. Đây là trạng thái database hiện tại, không phải suy đoán về deployment chưa tồn tại.

**Cần hoàn tất:** Trước khi dùng database này trên Internet: đổi mật khẩu hoặc vô hiệu hóa tài khoản demo, thu hồi phiên cũ, rà lại admin thực sự. Không chỉ tắt ENABLE_DEV_SEED: cờ đó không xóa tài khoản đã có.

Nguồn mã: [aita-backend/src/database/dev-seed.ts:12](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/database/dev-seed.ts:12).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/database-readonly-check.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/database-readonly-check.json).

### F02 · P0 — Chạy JavaScript do AI tạo ngay trong tiến trình backend

**Bằng chứng:** Đã tái hiện bằng solver vô hại.

generateRubricRulesAsync dùng new Function để chạy javascriptSolver từ phản hồi mô hình, ngoài Docker và không có giới hạn thời gian riêng. Probe thay phản hồi AI bằng hàm chỉ đọc process.version đã đọc được phiên bản Node của host. Không đọc bí mật, không thực hiện payload tấn công. Kết quả chứng minh thiếu ranh giới thực thi; chưa chứng minh một prompt cụ thể khai thác được mô hình thật.

**Cần hoàn tất:** Bỏ thực thi solver trong API; chỉ chấp nhận expectedOutput đã xác minh hoặc chạy solver trong worker cô lập, timeout, giới hạn CPU/RAM, không mạng và không truy cập bí mật.

Nguồn mã: [aita-backend/src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.ts:716](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.ts:716).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/readiness-probes.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/readiness-probes.json).

### F03 · P1 — Đường API AI bỏ lọt thao tác ghi của sinh viên và thiếu phạm vi dữ liệu

**Bằng chứng:** Đã tái hiện HTTP middleware và use case cô lập.

POST /ai/save-assignment chỉ yêu cầu đăng nhập. Use case nhận creatorId, không nhận vai trò/phạm vi lớp và tạo bài Published cho classId tùy chọn. Probe ghi fixture xác nhận tài khoản mang định danh sinh viên có thể tạo bài cho lớp khác. /ai/assess, /rag/assess, /rag/chat và /rag/diagnose cũng cần kiểm tra quyền theo submission/exam trước khi đọc ngữ cảnh hoặc tiêu quota AI. Không gọi AI hay ghi database thật trong probe.

**Cần hoàn tất:** Áp dụng một chính sách quyền dùng chung cho toàn bộ API tương đương, không chỉ /grading. Chặn sinh viên tạo/công bố/chấm bài; kiểm tra sở hữu/ghi danh trước khi lấy source, rubric, điểm và ngữ cảnh RAG.

Nguồn mã: [aita-backend/src/modules/ai/presentation/ai.router.ts:24](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/presentation/ai.router.ts:24), [aita-backend/src/modules/ai/application/use-cases/save-ai-assignment.use-case.ts:7](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/application/use-cases/save-ai-assignment.use-case.ts:7), [aita-backend/src/modules/ai/infrastructure/rag/rag-engine.service.ts:37](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/infrastructure/rag/rag-engine.service.ts:37).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/readiness-probes.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/readiness-probes.json).

### F04 · P1 — Lớp học còn lỗi truy cập chéo lớp

**Bằng chứng:** Đã tái hiện roster; kiểm tra route và use case cập nhật.

StudentPortalController.getClassDetail tìm lớp theo ID/môn/mã lớp mà không ràng buộc người gọi là thành viên. Probe sinh viên chưa ghi danh vẫn nhận danh sách và email fixture của lớp khác. PATCH /classes/:id cho mọi lecturer đi vào update; controller không chuyển user vào use case và use case không kiểm tra lớp phụ trách. Vì vậy có thể thay thông tin/phân công của lớp khác. Route danh sách sinh viên của giảng viên cũng thiếu kiểm tra sở hữu.

**Cần hoàn tất:** Ràng buộc membership/ownership ở truy vấn và service, trả 403/404 cho tài nguyên ngoài phạm vi. Bổ sung ma trận student/lecturer/admin trên cả API chi tiết, roster, sửa lớp và phân công.

Nguồn mã: [aita-backend/src/modules/student-portal/presentation/student-portal.controller.ts:470](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/student-portal/presentation/student-portal.controller.ts:470), [aita-backend/src/modules/classes/presentation/classes.controller.ts:122](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/classes/presentation/classes.controller.ts:122), [aita-backend/src/modules/classes/application/use-cases/update-class.use-case.ts:12](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/classes/application/use-cases/update-class.use-case.ts:12).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/readiness-probes.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/readiness-probes.json).

### F05 · P1 — Một luồng đánh giá AI đang lỗi kết nối UoW và có quy tắc ghi điểm không tương thích

**Bằng chứng:** Đã tái hiện UoW thật với cộng tác viên fixture.

AssessSubmissionUseCase tìm client qua uow.prisma hoặc resolve(Symbol.for("PrismaClient")), nhưng PrismaUnitOfWork chỉ có getClient() và DI không đăng ký factory này. Sau khi đánh giá sẽ lỗi thiếu factory. Khi tiêm client fixture để kiểm tra nhánh ghi, nhánh đó ghi đè điểm/report đã công bố, không chuyển về DRAFT, không áp dụng penalty/audit chuẩn và đặt GRADED_BY_AI trong khi bảng điểm dùng Graded. Không kết luận API hiện tại đã sửa được điểm thật: wiring đang chặn trước nhánh ghi.

**Cần hoàn tất:** Đưa các đường chấm về cùng hàng đợi và hợp đồng trạng thái/điểm; sửa wiring đồng thời với quyền, review status, penalty và audit. Không chỉ thêm factory để nhánh ghi thiếu kiểm soát bắt đầu chạy.

Nguồn mã: [aita-backend/src/modules/ai/application/use-cases/assess-submission.use-case.ts:36](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/application/use-cases/assess-submission.use-case.ts:36), [aita-backend/src/shared/infrastructure/prisma-unit-of-work.ts:92](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/shared/infrastructure/prisma-unit-of-work.ts:92).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/readiness-probes.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/readiness-probes.json).

### F06 · P1 — Chưa có giới hạn thử đăng nhập/OTP và giới hạn tệp trên các API AI

**Bằng chứng:** Đã tái hiện 120 yêu cầu qua middleware; rà soát source.

Middleware rateLimiter có mã nhưng không được gắn vào auth routes. Probe 120 yêu cầu login fixture đều đi qua, không có 429. Forgot/reset password không có bộ đếm số lần thử OTP; OTP sinh bằng Math.random. AiRouter dùng multer.memoryStorage không có limits.fileSize, trong khi mọi tài khoản đăng nhập có thể tới nhiều endpoint AI. Các giới hạn JSON 100 MB không giới hạn upload multipart.

**Cần hoàn tất:** Giới hạn theo IP và tài khoản cho login/reset/forgot, giới hạn attempts/TTL cho OTP, dùng crypto.randomInt, đặt giới hạn upload và quota/concurrency AI. Cấu hình proxy/IP tin cậy có kiểm thử thay vì tin mọi X-Forwarded-For.

Nguồn mã: [aita-backend/src/modules/auth/presentation/auth.router.ts:20](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/auth/presentation/auth.router.ts:20), [aita-backend/src/modules/auth/application/use-cases/forgot-password.use-case.ts:31](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/auth/application/use-cases/forgot-password.use-case.ts:31), [aita-backend/src/modules/ai/presentation/ai.router.ts:8](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/presentation/ai.router.ts:8).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/readiness-probes.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/readiness-probes.json).

### F07 · P1 — Khóa tài khoản và đổi/reset mật khẩu chưa thu hồi đầy đủ phiên đăng nhập

**Bằng chứng:** Xác nhận đường mã.

authenticate chỉ xác minh JWT, không đối chiếu trạng thái/tokensVersion. ToggleLock chỉ lưu trạng thái user; đổi/reset password không gọi revokeAllForUser. Access token cũ tiếp tục hợp lệ tới khi hết hạn. Sau đổi mật khẩu, refresh token cũ vẫn có thể được dùng khi user còn active. Không coi JWT stateless tự thân là lỗi; điểm thiếu là hành vi thu hồi cần cho khóa tài khoản và phục hồi mật khẩu.

**Cần hoàn tất:** Thiết kế thu hồi phiên theo token version/session hoặc danh sách thu hồi; revoke refresh tokens khi đổi/reset mật khẩu/khóa user và xác minh phiên đang dùng tại các API nhạy cảm.

Nguồn mã: [aita-backend/src/middleware/auth.ts:28](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/middleware/auth.ts:28), [aita-backend/src/modules/users/application/use-cases/toggle-lock.use-case.ts:31](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/users/application/use-cases/toggle-lock.use-case.ts:31), [aita-backend/src/modules/auth/application/use-cases/change-password.use-case.ts:35](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/auth/application/use-cases/change-password.use-case.ts:35).

### F08 · P1 — Dependency audit có cảnh báo nghiêm trọng, gồm thư viện xử lý ZIP trực tiếp

**Bằng chứng:** npm audit và advisory đã đối chiếu.

npm audit --omit=dev: frontend 4 package entries (1 critical, 3 high), backend 50 (2 critical, 19 high, 26 moderate, 3 low). Đây là package entries trong cây phụ thuộc, không phải 54 exploit độc lập hay 54 đường mã đã chứng minh khai thác. Next 16.3.6 nằm trong dải ảnh hưởng advisory critical; adm-zip 0.5.18 và xlsx 0.18.5 cũng bị cảnh báo. Mức khai thác phụ thuộc tính năng được dùng. Backend còn đưa test tooling vào dependencies nên audit production bao gồm cả nhánh đó.

**Cần hoàn tất:** Nâng Next/eslint-config-next cùng lockfile lên bản đã vá tương thích; vá adm-zip và các parser nhận dữ liệu không tin cậy; chọn bản phân phối/thư viện Excel được duy trì. Phân loại đường thực sự dùng trước khi nâng major; không chạy audit fix --force mù quáng. Thêm security gate vào CI.

Nguồn mã: [aita-fontend/package.json:19](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-fontend/package.json:19), [aita-backend/package.json:34](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/package.json:34).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/frontend-dependencies.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/frontend-dependencies.json).

Nguồn ngoài: [github.com](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [github.com](https://github.com/advisories/GHSA-7q85-xj36-vmfc), [github.com](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).

### F09 · P1 — Schema hiện có nhưng lịch sử Prisma migration chưa sẵn sàng cho lệnh deploy mặc định

**Bằng chứng:** Kiểm tra chỉ đọc database hiện tại.

Prisma validate đạt, nhưng migrate status báo cả 3 migration chưa áp dụng theo ledger. Database hiện có bảng nghiệp vụ, queue và realtime. Docker CMD chạy db:migrate trước khi khởi động, nên không thể xem schema đang tồn tại là bằng chứng lệnh migrate deploy sẽ thành công. Diff chỉ đọc còn thấy khác biệt FK và index HNSW; index vector tùy chỉnh không tự động coi là lỗi hoặc xóa theo diff.

**Cần hoàn tất:** Backup, đối chiếu baseline với schema thật, xác định migration nào đã chạy bằng SQL thủ công, rồi baseline/resolve có kiểm soát trên bản sao trước. Không chạy reset, không đánh dấu applied khi chưa xác minh, không thực thi SQL diff hiện tại chỉ để làm sạch báo cáo.

Nguồn mã: [aita-backend/Dockerfile:21](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/Dockerfile:21).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/migration-status.log](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/migration-status.log).

### F10 · P1 — Dockerfile thiếu quyền ghi thư mục artifacts của người dùng runtime

**Bằng chứng:** Tái hiện EACCES với chính lớp đã build.

Image chuyển sang USER node nhưng chỉ tạo/chown temp, uploads và storage. LocalArtifactStore tạo /app/artifacts/files và được khởi tạo khi đăng ký grading routes. Mô phỏng quyền /app root-owned trong container không mạng, chạy lớp build hiện tại bằng user node, đã nhận EACCES. Clean image thiếu thư mục có thể lỗi khởi động; nếu thư mục được copy vào image nhưng root-owned thì lỗi khi ghi artifact.

**Cần hoàn tất:** Chuẩn hóa thư mục dữ liệu runtime, tạo và cấp quyền trước USER node, đưa artifacts vào storage đã cấu hình. Kiểm thử khởi động image sạch và lưu/đọc báo cáo dưới đúng UID runtime; tránh mang dữ liệu artifact local vào build context.

Nguồn mã: [aita-backend/Dockerfile:16](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/Dockerfile:16), [aita-backend/src/modules/grading/engine/infrastructure/file-system/LocalArtifactStore.ts:11](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/grading/engine/infrastructure/file-system/LocalArtifactStore.ts:11).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/docker-artifact-permissions.log](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/docker-artifact-permissions.log).

### F11 · P1 — Lưu trữ tệp và worker chấm cần thiết kế rõ trước khi chọn cấu hình Render

**Bằng chứng:** Xác nhận source và giới hạn nền tảng chính thức.

ZIP mới lưu trên filesystem; avatar/attachment và artifacts ở các thư mục khác. DB bền vững không giữ được các tệp này sau redeploy nếu dùng ổ đĩa ephemeral. Nếu tách worker, disk của một Render service không được chia sẻ với service khác. Bộ chấm dùng Docker daemon, bind đường dẫn cục bộ và probe cổng localhost; chỉ đưa API lên Docker hoặc đặt DOCKER_HOST không giải quyết việc source files/ports ở máy khác. Chưa có render.yaml hoặc mô hình runner từ xa hoàn chỉnh.

**Cần hoàn tất:** Chốt phạm vi chấm source-only hay thực thi thật. Dùng object storage riêng tư hoặc gom toàn bộ dữ liệu vào persistent disk có backup; worker khác máy phải tải artifact từ nguồn chung. Chạy mã sinh viên trên worker cô lập có giao thức vận chuyển source và kết quả. Không suy diễn Render tự cung cấp Docker daemon bên trong container ứng dụng.

Nguồn mã: [aita-backend/src/modules/submissions/infrastructure/submission-storage.ts:6](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/submissions/infrastructure/submission-storage.ts:6), [aita-backend/src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts:527](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts:527).

Nguồn ngoài: [render.com](https://render.com/docs/disks), [render.com](https://render.com/docs/free), [render.com](https://render.com/docs/docker).

### F12 · P1 — Thiếu SMTP hoặc gửi email thất bại vẫn có thể báo thành công

**Bằng chứng:** Xác nhận đường mã.

NodemailerService trả true trong nhánh mock khi thiếu cấu hình, kể cả production; khi gửi lỗi trả false thay vì throw. ForgotPasswordUseCase không kiểm tra boolean trả về, nên người dùng có thể được thông báo đã gửi OTP nhưng không nhận email. Trên Render Free, SMTP 25/465/587 bị chặn theo tài liệu hiện tại.

**Cần hoàn tất:** Production phải kiểm tra khả năng gửi email, báo lỗi có thể retry và không coi mock là giao hàng thành công. Chọn dịch vụ email HTTP hoặc hạ tầng hỗ trợ SMTP; kiểm thử reset-password/import thật trên staging với địa chỉ thử nghiệm.

Nguồn mã: [aita-backend/src/shared/infrastructure/email/nodemailer.service.ts:41](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/shared/infrastructure/email/nodemailer.service.ts:41), [aita-backend/src/modules/auth/application/use-cases/forgot-password.use-case.ts:58](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/auth/application/use-cases/forgot-password.use-case.ts:58).

Nguồn ngoài: [render.com](https://render.com/docs/free).

### F13 · P2 — Một số API AI vẫn phụ thuộc microservice chưa có mã chạy trong repo

**Bằng chứng:** Xác nhận đường mã và inventory.

ExternalAiService.generateExercise/assess/learningFeedback gọi AI_ENDPOINT, mặc định localhost:8000; một số fetch không có timeout. Thư mục aita-AI hiện chỉ có CONTRIBUTING.md và package-lock.json, không có main.py/requirements hay image triển khai. Điều này không có nghĩa engine Gemini/RAG hiện tại đều hỏng: các engine đó là luồng khác.

**Cần hoàn tất:** Hợp nhất sang provider đang dùng hoặc bổ sung microservice có mã nguồn, health check, auth và timeout. Nếu bỏ luồng cũ, gỡ/ẩn endpoint và UI tương ứng thay vì để các chức năng lỗi sau deploy.

Nguồn mã: [aita-backend/src/modules/ai/infrastructure/external-ai.service.ts:32](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/ai/infrastructure/external-ai.service.ts:32), [aita-backend/src/config/env.ts:17](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/config/env.ts:17).

### F14 · P2 — Kiểm tra trùng khi sửa lớp chưa xét đúng học kỳ

**Bằng chứng:** Xác nhận đường mã.

UpdateClassUseCase gọi findByCodeAndSubject khi đổi mã/môn/kỳ. Repository lọc ClassCode và SubjectId, bỏ SemesterId, trong khi ràng buộc database là bộ ba mã lớp/môn/kỳ và luồng tạo lớp đã xét đủ bộ ba. Có thể từ chối đổi sang kỳ hợp lệ vì một lớp của kỳ khác, hoặc bỏ sót trùng thật tùy bản ghi findFirst trả về.

**Cần hoàn tất:** Kiểm tra trùng bằng đủ bộ ba, loại trừ ID hiện tại và xử lý xung đột unique của database. Bổ sung test cùng mã lớp/môn trên nhiều học kỳ.

Nguồn mã: [aita-backend/src/modules/classes/application/use-cases/update-class.use-case.ts:30](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/classes/application/use-cases/update-class.use-case.ts:30), [aita-backend/src/modules/classes/infrastructure/repositories/prisma-class-repository.ts:65](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-backend/src/modules/classes/infrastructure/repositories/prisma-class-repository.ts:65).

### F15 · P2 — Cổng kiểm chứng build/lint/browser còn khoảng trống

**Bằng chứng:** Các lệnh kiểm tra đã chạy.

Lint src frontend có 0 lỗi và 1.027 cảnh báo. npm run lint toàn thư mục báo 1.407 lỗi/13.900 cảnh báo vì quét cả .next-local do thiếu ignore; không gọi đây là 1.407 lỗi mã ứng dụng. Backend có 115 file @ts-nocheck trên 469 file nguồn. Build Webpack đạt; build Turbopack mặc định lỗi xử lý CSS/font trong môi trường Windows này, chưa chứng minh Vercel Linux cũng lỗi. vercel.json ở root còn cấu hình dist/index.html cũ và root package không có build; cần chọn root aita-fontend.

**Cần hoàn tất:** Chốt lệnh build production sau cập nhật Next và chạy CI Linux sạch. Loại build output khỏi lint, thêm lint/security/browser cần thiết vào CI và giảm nocheck dần. Chỉ coi test browser thất bại là bug sản phẩm sau khi phân loại fixture/môi trường.

Nguồn mã: [aita-fontend/eslint.config.mjs:14](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-fontend/eslint.config.mjs:14), [vercel.json:3](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/vercel.json:3), [.github/workflows/ci.yml:81](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/.github/workflows/ci.yml:81).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/frontend-source-lint.json](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/frontend-source-lint.json).

### F16 · P2 — Làm mới bài tập sinh viên tạm xóa danh sách đang xem

**Bằng chứng:** Đã tái hiện browser và chụp màn hình.

Trong loadData(true), latestAssignments khởi tạo bằng mảng rỗng. Khi dashboard trả về nhanh còn request assignments đang chờ, updateTasks kết hợp mảng rỗng và xóa tasks hiện hành. Probe giữ chậm API assignments: nút vẫn hiện Đang làm mới nhưng tổng bài tập về 0 và UI báo không tìm thấy bài. system-refresh.browser.cjs thất bại ở yêu cầu giữ nội dung cũ trong lúc refresh; đây là lỗi giao diện đã xác nhận. Không kết luận dữ liệu bị xóa khỏi database.

**Cần hoàn tất:** Giữ snapshot đang hiển thị trong background refresh, chỉ thay phần dữ liệu đã tải thành công hoặc commit snapshot mới khi đủ dữ liệu. Không biến response phụ đến trước thành trạng thái trống. Chạy lại toàn bộ các scenario của test refresh sau sửa.

Nguồn mã: [aita-fontend/src/features/assignments/screens/StudentAssignmentsPage.tsx:210](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/aita-fontend/src/features/assignments/screens/StudentAssignmentsPage.tsx:210).

Kết quả kiểm chứng: [output/production-readiness-2026-10-31/diagnose-refresh.log](E:/FPTU/Term07/SWD392/AI-Teaching-Assistant/output/production-readiness-2026-10-31/diagnose-refresh.log).

## Trình tự xử lý trước khi deploy

1. Đóng F01–F04 và F06–F08: tài khoản demo, thực thi mã AI, quyền API/IDOR, OTP/rate limit, phiên và dependency. Viết regression test phủ các API tương đương.
2. Sửa luồng AI và các quy tắc ghi điểm F05; xử lý giao dịch SaveAiAssignment dùng đúng client của transaction. Giữ điểm đã duyệt, penalty và audit thống nhất.
3. Sửa Docker runtime directories, xác nhận migration trên bản sao DB, chọn kho file bền vững và kiến trúc worker. Backup cả DB và tệp; thử restore.
4. Hoàn thiện email và các endpoint AI còn phụ thuộc localhost; sửa lỗi uniqueness theo kỳ.
5. Chạy CI Linux sạch, kiểm thử browser đỏ, kiểm thử AI thật với tập bài đã được giảng viên đối chiếu, kiểm thử tải/quota và log/alert.
6. Sau đó mới tạo staging trên Vercel/Render, kiểm thử ba vai trò, upload/download, reconnect, restart/redeploy và phục hồi job trước khi mở public.

## Cấu hình dự kiến cho Vercel và Render

**Vercel:** Root Directory phải là `aita-fontend`, framework Next.js; không dùng cấu hình SPA/dist ở root repo. Thiết lập `NEXT_PUBLIC_API_URL` và `API_PROXY_TARGET` bằng backend HTTPS thực tế rồi build lại, vì giá trị public được đóng vào bundle. Nếu dùng proxy cùng origin, cấu hình `NEXT_PUBLIC_API_URL=/api` và `API_PROXY_TARGET=https://<backend>`; kiểm thử upload lớn và SSE trên nền tảng, không suy từ proxyTimeout local. Với request dài/upload, cân nhắc gọi backend trực tiếp để tránh ràng buộc proxy. Tài liệu Vercel xác nhận external rewrites hoạt động như reverse proxy và CDN chờ origin bắt đầu gửi tối đa 120 giây; đây không phải giới hạn chung 4,5 MB của Vercel Functions. [Rewrites](https://vercel.com/docs/routing/rewrites), [Origin timeout](https://vercel.com/changelog/cdn-origin-timeout-increased-to-two-minutes).

**Render:** backend Node/Docker phải phù hợp với runtime cần chấm. Dockerfile hiện tại chưa đủ để coi là sẵn sàng: cần xử lý F09–F11. Dùng web service không ngủ cho production có job; worker tách riêng cần kho artifact chung, không dựa vào disk local của API. Root Directory `aita-backend`; tách bước migrate sau khi baseline đã được xác minh; readiness gồm DB và các capability thực sự bật. Không chạy `prisma db seed`, `migrate reset` hoặc `db push --accept-data-loss` trên dữ liệu thật.

Biến môi trường cần chốt sau khi có domain: `NODE_ENV=production`, `DATABASE_URL`/`DIRECT_URL` PostgreSQL đúng SSL/pooling, JWT ngẫu nhiên tối thiểu 32 ký tự, CORS_ORIGIN/FRONTEND_URL chỉ origin tin cậy, `AI_STUB_MODE=false`, `ENABLE_DEV_SEED=false`, nơi lưu file bền vững, provider AI/email, worker và sandbox đúng khả năng hạ tầng. Không bật SANDBOX_ENABLED chỉ để bỏ cảnh báo nếu chưa có runner cô lập hoạt động. Không đưa API key/DB URL vào biến NEXT_PUBLIC_.

Render Free không nên dùng để kết luận production đã sẵn sàng: filesystem ephemeral, không persistent disk, có sleep/restart và chặn SMTP phổ biến; database Free có hạn sử dụng và thiếu backup. Đối chiếu [Free instances](https://render.com/docs/free), [Persistent disks](https://render.com/docs/disks). Các giới hạn này là cấu hình triển khai cần lựa chọn, không phải lỗi đã xảy ra trên deployment chưa tồn tại.

## Điều kiện thay đổi kết luận

Chỉ đánh giá lại là có thể mở production sau khi P0/P1 được đóng bằng thay đổi cụ thể và kiểm thử hồi quy, một build Linux production sạch đạt, dữ liệu đã backup/restore thử, và staging trên hạ tầng đã chọn chạy được các chức năng được công bố. Các cảnh báo/P2 có thể chấp nhận có chủ đích nếu ghi rõ người chịu trách nhiệm và giới hạn chức năng.

## Tệp kiểm chứng

Toàn bộ log/JSON/probe nằm trong `output/production-readiness-2026-10-31`. File `schema-drift.sql` chỉ là kết quả so sánh, **không phải script migration đề xuất thực thi**. Báo cáo đánh giá hiện tại thay cho việc chỉ dựa vào kết luận tích cực của audit cũ; các số liệu cũ không bị xóa hoặc đổi lịch sử.
