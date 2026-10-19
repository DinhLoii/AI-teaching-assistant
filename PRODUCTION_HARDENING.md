# Triển khai bản sửa theo báo cáo ngày 17/10/2026

## Các thay đổi trong mã nguồn

- API engine bài tập chặn sinh viên thực hiện thao tác ghi, chặn tải đáp án SQL, kiểm tra quyền theo bài/lớp cho giảng viên và lọc danh sách/thùng rác theo quyền. Dữ liệu trả cho sinh viên chỉ giữ phần rubric công khai. Xuất bản ghi Exam và PublishedAssignment trong cùng giao dịch.
- ZIP mới lưu ở `storage/submissions` thay vì thư mục công khai. Các URL `/uploads/submissions/...` cũ bị chặn, kể cả đường dẫn mã hóa; API xem/tải ZIP vẫn đọc được tệp cũ sau khi kiểm tra quyền. Không tiếp tục sao chép ZIP mới lên Cloudinary công khai. Việc dò trùng mã nguồn cũng đọc từ kho riêng.
- Nộp bài và tạo công việc chấm liên tục được ghi trong cùng giao dịch PostgreSQL. Bấm chấm lại/batch chỉ xếp việc vào hàng đợi; tải và giải nén diễn ra trong worker. Mỗi lượt nhận việc có khóa riêng, heartbeat, tối đa ba lần nhận việc, phục hồi khi lease hết hạn và chống ghi kết quả từ lượt chấm cũ. Chấm lại chuyển kết quả về bản nháp; lỗi không biến thành điểm 0 và không xóa điểm cũ.
- Sự kiện thông báo, tiến độ và thay đổi bài tập được chuyển giữa các tiến trình qua bảng RealtimeEvent, có chống phát lặp và dọn dữ liệu cũ. Trong cùng tiến trình vẫn cập nhật ngay; chuyển giữa các tiến trình dùng chu kỳ đọc khoảng một giây. Sau mất kết nối, dữ liệu API được đọc lại làm nguồn chuẩn.
- SSE chấm bài dùng Authorization header, không đưa JWT vào URL. Các stream không bị nén/buffering. Access/error log che token, mật khẩu, OTP và các tham số bí mật. Tài khoản demo chỉ được seed khi bật rõ ràng và DB nằm ở localhost trong chế độ development.
- Nhận diện Android/Gradle trước nhánh Java/Maven. Báo cáo ghi phương thức từng tiêu chí và thông báo khi không có môi trường thực thi; không tự công nhận app Android đã build/chạy acceptance test.
- Sửa các lỗi React ref trong render, lưu hai font và giấy phép trong dự án, thêm lint/kiểm thử backend và PostgreSQL vào CI.

## Nâng cấp cơ sở dữ liệu đang có

Không reset DB và không chạy seed demo. Bản sửa cần hai bảng mới: `SubmissionGradingTask` và `RealtimeEvent`; migration chỉ thêm bảng/index và bật RLS cho hai bảng này. Backend cần tài khoản dịch vụ có quyền trên chúng; cấu hình mặc định dùng cùng chủ sở hữu bảng cho kết nối Prisma và migration.

Migration bổ sung nằm tại:

`aita-backend/prisma/migrations/20261017000000_durable_grading_realtime/migration.sql`

Với DB PostgreSQL đang có, áp dụng migration bổ sung sau khi được chủ DB cho phép:

```powershell
cd aita-backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261017000000_durable_grading_realtime/migration.sql
npm run db:generate
```

Đã áp dụng migration bổ sung lên Neon hiện tại ngày 17/10/2026 sau khi chủ dự án cho phép. Đã xác minh hai bảng, RLS, quyền ứng dụng và đọc/ghi thử có rollback. Các mốc thời gian của hàng đợi/relay dùng TIMESTAMPTZ để tránh lệch múi giờ. Không reset dữ liệu, seed demo, sửa điểm hoặc tự xếp lại các bài nộp cũ. Khi triển khai sang DB khác chưa có hai bảng mới, `/api/ready` trả 503.

Lịch sử SQL Server được giữ ở `prisma/legacy-sqlserver-migrations`. Baseline PostgreSQL mới dùng cho DB rỗng. Với DB đã có dữ liệu, chỉ ghi nhận baseline sau khi đã backup và đối chiếu schema thực tế với baseline; không tự đánh dấu một schema đang lệch là đã migrate:

```powershell
npx prisma migrate resolve --applied 20261016000000_postgresql_baseline
npm run db:migrate
```

Không dùng `migrate reset`, `db push --accept-data-loss` hoặc bộ seed demo để nâng cấp dữ liệu thật. Các công việc Processing từ trước bản nâng cấp mà chưa có bản ghi hàng đợi cần giảng viên bấm chấm lại; việc đọc tiến độ không tự gửi lại mã nguồn cho AI.

## Triển khai mới

Docker Compose dùng PostgreSQL 16 có pgvector, volume riêng cho DB/ZIP, health check và bí mật được cấp từ môi trường. Không gắn Docker socket của host vào API. Cần điền `.env` cho Compose từ `.env.example`, cấu hình AI trong `aita-backend/.env` và dùng khóa JWT ngẫu nhiên thực sự; không dùng chuỗi mẫu. URL PostgreSQL phải encode các ký tự đặc biệt trong mật khẩu.

```powershell
docker compose config --quiet
docker compose up --build -d
```

Các cổng bind ở loopback để đặt sau reverse proxy HTTPS. Với SSE, proxy phải tắt buffering và cho phép kết nối dài. Health `/api/ready` chỉ đạt khi các bảng mới đã có.

Hai instance trên hai máy khác nhau cần cùng kho ZIP riêng có kiểm soát truy cập. Volume Docker cục bộ không tự chia sẻ tệp giữa các máy.

Khi nâng cấp một bản Docker đang dùng bind mount cũ, phải sao chép các tệp trong uploads sang volume tương ứng trước khi chuyển cấu hình; giữ nguyên đường dẫn tương đối của ZIP cũ. Không xóa thư mục/volume cũ trước khi đối chiếu được các bài nộp đã lưu.

## Phạm vi thực thi bài nộp

Mặc định cấu hình triển khai mới tắt sandbox. AI vẫn có thể đánh giá những tiêu chí mã nguồn được giảng viên cấu hình cho phương thức đó. Tiêu chí yêu cầu chạy test phải có runner hoạt động; thiếu runner sẽ báo lỗi cấu hình, không tự chuyển thành điểm 0 hay kết quả Pass.

Trước khi bật `SANDBOX_ENABLED=true`, cần môi trường Docker chấm bài riêng, giới hạn tài nguyên và mạng. Với daemon ở máy khác, workspace chứa bài giải nén phải được cung cấp đúng đường dẫn cho daemon và địa chỉ dịch vụ phải truy cập được từ worker; chỉ đặt DOCKER_HOST không đủ để hoàn thành cấu hình đó. Không mở Docker daemon không xác thực ra Internet.

Runner Android/emulator chưa được triển khai. Acceptance test tương tác Android vẫn cần giảng viên kiểm chứng. Bản sửa hiện tại bảo đảm phần hiển thị không đồng nhất nhận xét AI với kết quả chạy test thật. Đây là giới hạn chức năng được giữ rõ ràng, không phải một runner đã được xác minh hoạt động.

## Kiểm thử và nghiệm thu

- `aita-fontend`: `npm run check:all`, `npm run lint`.
- `aita-backend`: `npm run build`, `npm test`.
- `aita-backend`: `npm run test:postgres` chỉ nhận `TEST_DATABASE_URL` riêng. Nó tạo schema ngẫu nhiên, kiểm tra cách ly, chạy fixture, rồi xóa đúng schema đó; không mặc định dùng DATABASE_URL của ứng dụng.
- Máy PostgreSQL cục bộ không cài pgvector có thể đặt `TEST_SKIP_PGVECTOR=true` để kiểm thử riêng phân quyền, hàng đợi và relay. Chế độ này bỏ cột vector trong schema test; không xác minh RAG/vector. CI dùng image pgvector để chạy migration đầy đủ.

Kết quả tại máy ngày 17/10/2026: build frontend/backend đạt, 78 test frontend đạt, 7 test backend và 7 test PostgreSQL cục bộ đạt (múi giờ Asia/Bangkok, bao gồm chặn ghi từ lease hết hạn). Lint không còn lỗi, còn 1.029 cảnh báo. Docker Compose qua kiểm tra cấu hình; chưa chạy triển khai container đầy đủ vì Docker daemon chưa hoạt động.

Sau khi chủ dự án xác nhận cho phép worker chạy liên tục, đã khởi động backend tại localhost:3001 cùng worker ngày 17/10/2026. `/api/health` và `/api/ready` đều trả HTTP 200; hàng đợi trống tại thời điểm kiểm tra, không tự xếp lại bài cũ. Đây là tiến trình development đang chạy trên máy hiện tại, chưa phải dịch vụ production tự khởi động lại sau khi tắt máy. Cấu hình SMTP hiện còn thiếu theo cảnh báo khởi động: email chưa được gửi thật cho đến khi cấp thông tin SMTP.

Trước khi sử dụng trên quy mô thật, vẫn phải nghiệm thu bộ bài có điểm chuẩn do giảng viên xác nhận, runner từng môn, tải đồng thời và quy trình backup/restore trên hạ tầng đích. Nếu ZIP cũ đã từng được công bố trực tiếp trên Cloudinary, cần kiểm tra và thu hồi/chuyển các bản sao trên dịch vụ đó; chặn URL của backend không thu hồi được URL bên ngoài.

Tham khảo hạ tầng vector: [tài liệu pgvector chính thức](https://github.com/pgvector/pgvector#docker).

## Bổ sung kiểm chứng console ngày 18/10/2026

Khắc phục bằng chứng mã nguồn ngày 19/10: tái hiện `AI_CODE_EVIDENCE_MISSING` với ZIP Student Score Manager có đường dẫn Windows và tham chiếu AI dùng dấu `/`. Các nhánh xác minh đoạn mã và lấy tệp tham chiếu dùng cùng hàm chuẩn hóa đường dẫn, ưu tiên khớp chính xác, tiếp tục từ chối traversal, tên tệp mơ hồ và nội dung không khớp. Snapshot mới dùng đường dẫn tương đối POSIX; prompt cấp FILE_ID và manifest cho từng tệp thực sự được gửi, có phản hồi lỗi ở vòng sửa và đổi phiên bản cache. Kết quả biên dịch/test được giữ khi AI lỗi; UI phân biệt lỗi chấm với lỗi kết nối. Hồi quy bao phủ C/C++/Java/Kotlin/Python/C#/TypeScript/SQL, thư mục Unicode, khoảng trắng, phạm vi dòng không hợp lệ và định dạng phản hồi cũ. Bài nộp `12afc4c8-0f4e-43bc-bfdf-02314f79fc30` đã được sao lưu rồi chấm lại qua worker: 6.75/10, 5 tiêu chí, biên dịch thành công, 4/8 testcase; lưu DRAFT, không công bố.

Log chi tiết ngày 19/10: sự kiện có `stage` và `status`, không còn phụ thuộc vào suy đoán bước từ câu chữ cho các lượt mới. Bước 1 ghi tệp gốc, dung lượng, SHA-256, giải nén, đối chiếu ngôn ngữ và snapshot; bước 2 ghi kết nối Docker, image ID và cấu hình container đọc từ `inspect`; bước 3 ghi chương trình/lệnh build/run, từng testcase, thời gian, trạng thái biên dịch, Pass/Fail/chưa chạy và dọn container. Lỗi Engine được mô tả bằng tiếng Việt kèm hành động khắc phục, không biến thành testcase thất bại. Bài console dùng runner riêng thay vì khởi tạo Web sandbox; bài khác giữ sandbox ứng dụng theo loại dự án. Các báo cáo cũ không được bổ sung log suy diễn. Đã kiểm thử observer với container Docker thật và trường hợp Engine không kết nối; không chấm lại dữ liệu sinh viên để tạo log lịch sử.

Nhật ký chấm được cập nhật ngày 19/10/2026: bỏ toàn bộ tiến trình mô phỏng, điểm mặc định 9.5, container ID ngẫu nhiên và thông báo tự nhận tất cả test đạt trong modal/trang live. UI đọc sự kiện server theo bài nộp và lượt chấm, dùng thời gian server; tối đa 200 sự kiện được lưu vào báo cáo. Báo cáo cũ không có log được ghi rõ là thiếu nhật ký. Lượt chấm lại thất bại giữ riêng nhật ký lỗi, không trình bày điểm cũ như kết quả của lượt lỗi. Log nội bộ không xuất cho sinh viên. Kiểm thử UI độc lập: `node tests/grading-log.browser.cjs` trong frontend với `TEST_BASE_URL` trỏ tới bản build kiểm thử, toàn bộ API được giả lập.

`STDIO_SANDBOX_ENABLED=true` bật riêng runner console, không bật sandbox Web/SQL. Cấu hình cục bộ đã bật cờ này; Docker Desktop cần tiếp tục chạy. Runner dùng container không mạng, user không đặc quyền, giới hạn CPU/RAM/PID, filesystem gốc chỉ đọc và thư mục làm việc tạm.

Bài console có testcase sẽ được kiểm chứng độc lập kể cả khi các tiêu chí dùng AI; kết quả chạy và biên dịch được lưu trong báo cáo, không cộng thêm một ngân sách điểm ngoài rubric. Tiêu chí đã dùng StdInOutProbe tiếp tục dùng kết quả chấm của tiêu chí đó. Lỗi hạ tầng không được ghi thành testcase Pass/Fail; lỗi biên dịch không được coi là đã chạy testcase. Kiểm thử Docker thực tế chạy bằng `npm run test:console-docker`.

Đã sửa bộ đọc Word để giữ xuống dòng trong ô bảng và chặn việc lấy các câu văn nhắc đến input/output làm testcase. Riêng đề Mini Inventory trong báo lỗi đã được sao lưu rồi đối chiếu lại từ file Word gốc: sửa thành 10 testcase, chạy ZIP C++ mới nhất bằng GCC thực tế và lưu kết quả 2/10, biên dịch thành công vào báo cáo nháp. Giữ nguyên điểm AI và trạng thái chưa công bố. Các đề cũ khác có dữ liệu trích sai vẫn cần đối chiếu tài liệu gốc trước khi sửa; không tự sửa hàng loạt hoặc bịa output.
