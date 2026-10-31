# AITA — Báo cáo tổng thể sau sửa lỗi

Ngày kiểm tra: 31/10/2026. Mục tiêu triển khai: frontend Vercel, backend Render. Chưa tạo hoặc triển khai tài nguyên trên hai dịch vụ này.

## Kết luận

Các lỗi đã tái hiện về phân quyền, thực thi JavaScript do AI sinh, phiên đăng nhập, luồng chấm AI cũ, cập nhật lớp theo kỳ và làm mới bài tập đã được sửa trong mã nguồn và kiểm tra hồi quy. Quản lý điểm admin theo kỳ/lớp học phần/môn đã có đầy đủ luồng xem, chỉnh sửa, công bố và lưu lịch sử.

**Chưa nên mở production công khai ngay.** Theo yêu cầu mới nhất, giữ nguyên toàn bộ tài khoản và mật khẩu; mật khẩu mẫu chỉ cảnh báo và không chặn startup. Còn các điều kiện: đối chiếu lịch sử migration với database đang có; chuẩn bị hạ tầng, email/AI, backup và kiểm thử staging. Riêng thực thi mã sinh viên bằng Docker cần kiến trúc máy chấm riêng; bản Render hiện được chuẩn bị cho chế độ đọc source/review, chưa phải giải pháp chấm thực thi đầy đủ.

## Phạm vi dự án đã kiểm tra

Đợt rà soát ban đầu kiểm tra 19 module backend, 194 khai báo route và 57 route frontend. Kiểm tra cấu trúc hiện ghi nhận 234 file source frontend, đủ 57 route và không có lỗi ranh giới import hoặc vòng phụ thuộc runtime theo công cụ kiểm tra của dự án.

Đã xem các nhóm: đăng nhập/tài khoản/vai trò, lớp và ghi danh, môn/học kỳ, bài tập/rubric, nộp bài và quyền xem file, pipeline chấm/hàng đợi, điểm và công bố, thông báo/realtime, tích hợp AI/RAG, cấu hình build/Docker/CI, dependency và biến môi trường. Đây là kiểm tra có phạm vi và bằng chứng cụ thể; không có cơ sở để khẳng định toàn bộ dự án không còn bất kỳ bug nào.

## Chức năng quản lý điểm admin

- Route `/admin/gradebook`, có lối vào từ danh sách điều hướng và chi tiết lớp.
- Chọn học kỳ, lớp học phần và môn; xem từng sinh viên, bài đánh giá, điểm thành phần và tổng có trọng số.
- Chỉnh điểm/feedback, lưu nháp hoặc công bố; chấp nhận điểm 0 và phân biệt chưa có điểm.
- Trọng số riêng từng lớp; không thay đổi điểm lớp khác cùng môn.
- Kiểm tra revision để trả 409 khi dữ liệu đã bị người khác sửa; lưu hàng loạt theo giao dịch và rollback khi có lỗi.
- Lưu lịch sử thay đổi, người thực hiện/lý do; thông báo khi công bố; xuất Excel.
- Điểm chưa công bố không lộ ở kết quả sinh viên. Cùng một bài đánh giá dùng ở nhiều lớp vẫn được xử lý theo lớp.

Mô hình hiện tại: mỗi bản ghi lớp học phần gắn một môn và một kỳ. Đây là bảng điểm theo lớp học phần; không tự bổ sung mô hình lớp hành chính có nhiều môn bên trong.

## Đối chiếu 16 phát hiện ban đầu

1. **F01 — Tài khoản mẫu: giữ nguyên theo yêu cầu chủ dự án.** Không đổi mật khẩu, không vô hiệu hóa tài khoản và không chạy công cụ áp dụng. Production chỉ cảnh báo về mật khẩu mẫu, không chặn khởi động vì lý do này. Đây là rủi ro còn tồn tại, không được tính là đã khắc phục. Công cụ đổi mật khẩu vẫn là tùy chọn cho lần sử dụng sau.
2. **F02 — Chạy mã AI trong API: đã sửa.** Loại bỏ `new Function` và yêu cầu sinh solver trong prompt. Bỏ trường solver khỏi cấu hình trả về, chỉ giữ testcase có expected output dạng dữ liệu. Test dùng solver đánh dấu vô hại chứng minh hàm không được thực thi. Expected output do AI sinh vẫn cần giảng viên xác minh.
3. **F03 — Quyền API AI và dữ liệu RAG: đã sửa các đường được phát hiện.** Sinh viên bị chặn thao tác tạo/lưu/chấm bài và các thao tác AI dành cho staff. Kiểm tra assignment/submission và lớp trước khi đọc ngữ cảnh hoặc ghi dữ liệu. Sinh viên chỉ đọc bài nộp của mình đã công bố; ngữ cảnh tutor loại bỏ hidden execution logs/đáp án tham chiếu. Luồng lưu bài dùng transaction client và không nuốt lỗi liên kết lớp/rubric.
4. **F04 — Truy cập chéo lớp: đã sửa các đường được phát hiện.** Student portal ràng buộc ghi danh, loại fallback không kiểm tra membership. Chi tiết lớp, roster, cập nhật lớp và đọc/stream thông báo lớp có guard. Stream thông báo lớp yêu cầu đăng nhập, không còn mở công khai.
5. **F05 — Luồng assess AI lỗi UoW/ghi đè điểm: đã sửa.** API assess sử dụng `getClient()` và đưa vào durable grading queue; không tự gọi AI rồi ghi đè trực tiếp điểm đã công bố. Kết quả HTTP là 202 khi đưa vào hàng đợi.
6. **F06 — OTP, rate limit, upload AI: đã sửa và còn giới hạn vận hành rõ ràng.** OTP từ bộ sinh ngẫu nhiên mật mã, chỉ lưu digest; tối đa 5 lần thử/15 phút trong database với advisory lock, kể cả nhiều caller. Có limiter đăng nhập/quên mật khẩu theo tài khoản; multipart AI giới hạn 20 MiB, một file và số field. Limiter HTTP tổng quát lưu trong bộ nhớ, phù hợp một API instance; scale nhiều instance cần kho limiter dùng chung. OTP limiter đã được lưu bền vững.
7. **F07 — Phiên sau đổi mật khẩu/khóa tài khoản: đã sửa.** JWT/refresh token gắn phiên bản credential; request xác minh trạng thái/vai trò hiện tại và mốc thu hồi. Đổi mật khẩu hoặc trạng thái thu hồi refresh token và cập nhật mốc trong cùng transaction; stale save không khôi phục mật khẩu cũ. Refresh token tiêu thụ nguyên tử, chống quay vòng hai lần. Không cho bỏ qua yêu cầu đổi mật khẩu. WebSocket kiểm tra khi xác thực/thao tác và heartbeat; SSE kiểm tra lại định kỳ 30 giây (stream lớp 25 giây). Luồng đang mở có độ trễ đóng tương ứng, không tuyên bố thu hồi ngay ở mọi transport. Giao diện đổi mật khẩu quay về đăng nhập vì token hiện tại cũng bị thu hồi.
8. **F08 — Dependency: đã vá các gói chạy thật có cảnh báo.** Cả FE/BE `npm audit --omit=dev` đều 0. Đã cập nhật Next/eslint-config-next, Axios, Multer, Nodemailer, adm-zip, Zod, jsonpath-plus, SheetJS và các dependency phù hợp; bỏ thư viện không dùng, vô hiệu hóa eval JSONPath. Audit đầy đủ vẫn có cảnh báo công cụ phát triển, nêu ở phần nợ kỹ thuật.
9. **F09 — Migration ledger: chưa đối chiếu/đánh dấu trên database thật.** Đã bổ sung preflight chặn production nếu thiếu baseline hoặc migration chưa được ghi nhận; bỏ tự sửa semester lúc production startup. Runbook mô tả backup/clone, kiểm tra schema/data rồi mới resolve chính xác từng migration đã chứng minh. Không tự reset hoặc đánh dấu áp dụng hàng loạt vì có thể làm sai lịch sử database đang chứa dữ liệu.
10. **F10 — Docker nonroot ghi artifact lỗi: đã sửa và tái kiểm chứng.** Chuẩn bị/chown thư mục artifact; image chạy compiled JavaScript bằng user `node`. Probe container thật xác nhận UID 1000 và vòng ghi/đọc artifact thành công.
11. **F11 — Render storage/worker: đã chuẩn bị storage, còn giới hạn kiến trúc máy chấm.** `RUNTIME_DATA_DIR` gom upload, private submission và artifact dưới persistent disk; thêm `render.yaml` và yêu cầu disk trên Render. File cũ phải chuyển đúng vị trí; thay biến môi trường không tự chuyển file. API Render không có Docker daemon chỉ vì chạy Docker image. Máy chấm tách host và file-transfer/shared storage chưa được triển khai trong đợt này; không xem F11 là hoàn tất cho nhu cầu chấm thực thi đầy đủ.
12. **F12 — Email báo thành công giả: đã sửa mã, còn nghiệm thu nhà cung cấp thật.** Production thiếu cấu hình hoặc gửi thất bại trả lỗi 503. Có đường Resend HTTPS hoặc SMTP; OTP không in ra log mock. Chưa gửi email thật hoặc xác minh domain gửi.
13. **F13 — AI phụ thuộc localhost:8000: đã sửa mã, còn nghiệm thu AI thật.** Các API cũ dùng AI client/fallback đang có trong dự án và validate JSON/schema; loại phụ thuộc microservice không tồn tại. Feedback lấy bài đã công bố. Rubric kiểm tra tổng điểm theo yêu cầu. Chưa gọi mô hình thật để đánh giá chất lượng/độ đúng của điểm.
14. **F14 — Trùng mã lớp giữa các kỳ: đã sửa.** Khi cập nhật, kiểm tra khóa mã lớp + học kỳ + môn, đồng nhất với mô hình tạo lớp.
15. **F15 — Build/lint/CI: đã sửa lỗi cấu hình, còn nợ chất lượng.** Build dùng Webpack, loại thư mục `.next-*` khỏi lint, bỏ root rewrite SPA lỗi thời. CI thêm lint, audit production và hai browser regression chính (bảng điểm/làm mới) trên production server. Typecheck và build giữ nguyên kiểm tra lỗi. Còn 1.027 lint warnings và 115 file backend có `ts-nocheck`; chưa tuyên bố backend được kiểm tra kiểu đầy đủ. CI Linux mới cần chạy trên hệ thống CI thực tế.
16. **F16 — Refresh xóa danh sách bài tập: đã sửa.** Giữ snapshot đến khi đủ dữ liệu nguồn; gộp lượt tải đang chạy; tránh tải lại thừa từ CONNECTED đầu tiên của thông báo; phối hợp sự kiện focus/visibility. Cả sáu scenario refresh kiểm tra giữ dữ liệu, pending, chống bấm trùng, lỗi và retry đều đạt.

## Kết quả kiểm chứng sau sửa

- Backend build: đạt; chạy compiled ESM thành công trong Docker image.
- Frontend Next.js 16.4.3 production build bằng Webpack: đạt. Bản cuối dùng thư mục build riêng `.next-fixes-final` để tránh đụng server local; không tắt TypeScript/build validation.
- Frontend structure/typecheck: đạt, 234 source files/57 routes.
- Backend automated tests: **103 đạt, 0 thất bại, 4 bỏ qua** (107 tổng). Trong đó 15 regression mới kiểm tra quyền, credential/session, OTP, solver, RAG, rollback và preflight.
- Frontend automated tests: **113 đạt, 0 thất bại, 1 bỏ qua** (114 tổng).
- Browser suites: **20/20 đạt sau một lần chạy lại do file ảnh bị khóa trên Windows**. First-pass 19/20; bộ submission-report thất bại ở thao tác ghi PNG, chạy lại với `TEST_ARTIFACT_DIR` riêng đạt. Giữ cả log trước/sau, không che lỗi lần đầu. Sáu scenario refresh đạt trên bản production cuối.
- PostgreSQL tạm: **10/10 đạt**, gồm queue/lease/realtime, credential rotation, stale write và OTP đồng thời. Schema riêng được dọn sau mỗi lần chạy; database ứng dụng không được dùng để ghi fixture.
- Gradebook với Prisma/PostgreSQL thật: đạt Decimal/revision, điểm 0, tổng trọng số, audit/thông báo, 409, bulk rollback và trọng số riêng lớp.
- Docker C++ thật: đạt kiểm tra stdout/stderr, exit khác 0, lỗi compile và không bịa kết quả testcase.
- Backend Docker build: đạt. Probe không mạng xác nhận UID 1000, artifact round trip và root persistent đúng.
- Audit dependency chạy thật: **FE 0, BE 0** theo cơ sở dữ liệu npm audit tại thời điểm chạy.
- Frontend lint: **0 errors, 1.027 warnings**.
- Backend local `/api/health` trả `ok`, `/api/ready` trả `ready`. Đây là smoke local, không phải xác minh Render production.

Các test bỏ qua không được tính là đạt. PostgreSQL local không có pgvector nên phần relational integration dùng baseline bỏ cột vector; chưa tái kiểm chứng semantic search/embedding trên pgvector thật. Docker C++ đã chạy thật; các runtime/ngôn ngữ khác không được coi là đã nghiệm thu lại toàn bộ trong đợt sửa này.

## Điều kiện còn thiếu trước production

1. Giữ nguyên account/mật khẩu theo yêu cầu mới nhất. Dùng cùng database hoặc bản sao được phục hồi đầy đủ để đăng nhập bằng thông tin hiện tại. Không chạy `security:demo -- --apply`. Mật khẩu mẫu không còn là điều kiện chặn deploy, nhưng vẫn là rủi ro bảo mật.
2. Backup/restore thử và đối chiếu ba migration với schema/data trên bản clone; hoàn tất baseline được duyệt. Sau đó migrate/preflight trên database triển khai. Đây vẫn là điều kiện chặn mở production.
3. Tạo Vercel root `aita-fontend`, Render Docker có persistent disk, cấu hình URL/CORS/JWT/database/AI/email. Mẫu có `autoDeployTrigger: off`; không tự tạo tài nguyên hoặc phát sinh phí trong đợt kiểm tra.
4. Chọn chế độ source review hoặc triển khai thêm máy chấm Docker riêng và cơ chế chia sẻ file. Nếu cần toàn bộ tính năng thực thi mã, bước này là blocker chức năng, không phải tùy chọn cấu hình nhỏ.
5. Nghiệm thu staging thật: ba vai trò, reset mật khẩu nhận email, AI có key/model hợp lệ, upload/download lớn, file tồn tại sau restart, backup phục hồi, giới hạn kết nối DB/quota/CPU/RAM và tải đồng thời dự kiến.
6. Thiết lập log/alert/backup/retention; kiểm tra hạn mức hosting, đặc biệt request upload qua proxy Vercel. Chưa có bằng chứng về SLA, chịu tải production hoặc disaster recovery.

## Nợ kỹ thuật và rủi ro còn lại

Audit đầy đủ gồm devDependencies: backend 25 cảnh báo (1 low, 24 moderate), frontend xem `frontend-full-audit.json` (16 moderate tại lần kiểm tra). Không có high/critical trong kết quả đầy đủ. Các cảnh báo còn lại thuộc chuỗi công cụ dev/test/build; không nâng major cưỡng bức chỉ để làm sạch số liệu. Docker image backend hiện giữ build/migration tools; kết quả omit-dev không có nghĩa toàn bộ image không chứa công cụ có cảnh báo. Nên tách build/runtime stage và quản lý migration tooling trong đợt tối ưu tiếp theo.

Backend còn nhiều `any`/`ts-nocheck`, một số service lớn và các luồng legacy. Cần giảm theo module với test có ý nghĩa. Không bỏ luật lint hoặc vô hiệu hóa kiểm tra để làm báo cáo xanh. Node local là 22.18; một số dependency test mới yêu cầu patch Node 22 cao hơn, nên dùng Node 22 bản vá hiện hành trên CI/host; Docker build Linux đã dùng bản Node mới từ base image.

Bản dựng Windows có thể báo EPERM ở cache/ảnh nếu các tiến trình cùng giữ file. Build cuối hoàn thành; test ảnh đã có tùy chọn thư mục output riêng. Đây được phân biệt với lỗi sản phẩm thay vì tính lẫn vào kết quả pass.

## Tài liệu và bằng chứng

- Runbook cụ thể: `aita-backend/docs/PRODUCTION_DEPLOYMENT.md`.
- Mẫu Render: `render.yaml`; Vercel dùng root directory `aita-fontend` và `aita-fontend/vercel.json`.
- Tài liệu bảng điểm: `aita-fontend/docs/admin-gradebook.md`.
- Bằng chứng sau sửa: `output/production-fixes-2026-10-31/`, gồm build/test/lint/audit, browser first-pass + rerun, PostgreSQL, gradebook và Docker storage.
- Báo cáo trước sửa: `PRODUCTION_READINESS_REVIEW_2026-10-31.md`; bằng chứng cũ được giữ riêng để so sánh.

Không deploy, không reset database, không ghi điểm fixture vào database đang dùng, không tự đổi mật khẩu và không đẩy commit lên remote trong đợt này. Những file người dùng đang làm ngoài phạm vi được giữ nguyên.
