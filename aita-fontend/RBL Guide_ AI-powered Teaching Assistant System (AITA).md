**ĐỀ CƯƠNG CHI TIẾT HỌC TẬP DỰA TRÊN NGHIÊN CỨU (RBL): DỰ ÁN AITA (10 TUẦN)**

**1\. Tổng quan Dự án & Triết lý Học tập (RBL)**

Dự án **AITA (AI-powered Teaching Assistant System)** được định vị là một giải pháp công nghệ chiến lược nhằm giải quyết triệt để tình trạng quá tải trong công tác quản lý và đào tạo tại Đại học FPT. Trong kỷ nguyên số, giảng viên CNTT đang phải đối mặt với áp lực khổng lồ từ việc chấm bài lập trình thủ công—quy trình tiêu tốn hàng giờ cho việc giải nén tệp, cấu hình môi trường cục bộ và rà soát hàng nghìn dòng mã. AITA ra đời để chuyển đổi những thách thức này thành cơ hội tối ưu hóa thông qua tự động hóa thông minh.

Bằng cách áp dụng phương pháp **Học tập dựa trên Nghiên cứu (Research-Based Learning - RBL)**, sinh viên không đơn thuần là người thực thi mã nguồn mà trở thành những nhà nghiên cứu giải pháp. Thay vì tiếp nhận kiến thức thụ động, người học phải chủ động giải mã các bài toán kỹ thuật phức tạp để làm chủ công nghệ lõi. Dự án tập trung vào 03 mục tiêu chiến lược:

*   **Tự động hóa đánh giá toàn diện:** Triển khai cơ chế chấm bài tự động trong môi trường cô lập Docker Sandbox, không chỉ kiểm tra kết quả đầu ra (Black-box) mà còn phân tích chất lượng mã nguồn qua Semantic Assessment.
*   **Hỗ trợ phản hồi AI thời gian thực:** Tích hợp LLM Tutor để giải thích các lỗi logic phức tạp và cung cấp hướng dẫn cải thiện mã nguồn 24/7 theo phong cách một Senior Developer.
*   **Minh bạch hóa nỗ lực cá nhân:** Sử dụng Git API để phân tích dữ liệu commit, đảm bảo thẩm định chính xác đóng góp của từng thành viên và loại bỏ tình trạng "free-riding" trong các dự án nhóm.

**Bảng so sánh mô hình học tập truyền thống và mô hình RBL áp dụng cho AITA:**

Đặc điểm

Mô hình Truyền thống (Passive LMS)

Mô hình RBL (AITA Project)

**Tiếp cận Kỹ thuật**

Sử dụng các thư viện có sẵn, ít can thiệp sâu.

Thực hiện Research Spikes (Docker, Redis, LLM).

**Quy trình Đánh giá**

Chấm điểm dựa trên kết quả cuối kỳ.

Đánh giá liên tục qua Peer-to-Peer Audits và Code Review.

**Phản hồi Sư phạm**

Chậm, thường mang tính định lượng đơn thuần.

Tức thì, mang tính định tính qua AI Semantic Feedback.

**Tính chủ động**

Làm theo hướng dẫn có sẵn (Tutorial-driven).

Tự xây dựng kiến trúc (Prisma, SQL Server, Queue).

Việc thiết lập một triết lý học tập hiện đại chỉ thực sự hiệu quả khi đi kèm với một cấu trúc vận hành nhóm minh bạch và các quy tắc ứng xử chuyên nghiệp trong kỷ nguyên trí tuệ nhân tạo.

**2\. Cấu trúc Nhóm & Quy định Sử dụng Trí tuệ Nhân tạo (AI)**

Trong môi trường RBL, tính minh bạch và trách nhiệm giải trình là nền tảng của sự phát triển chuyên môn. Khi AI trở thành cộng sự, sinh viên phải giữ vai trò là "Kiến trúc sư kiểm soát" thay vì là người sao chép thụ động.

**Đăng ký vai trò cá nhân**

Mỗi nhóm (4-5 người) được cấu trúc như một đội ngũ phát triển phần mềm chuyên nghiệp. Mỗi thành viên phải đăng ký đảm nhiệm vai trò **Full-stack** cho ít nhất một phân hệ (Module) cụ thể của AITA. Việc làm chủ toàn trình từ thiết kế cơ sở dữ liệu (Prisma ORM & SQL Server), logic xử lý phía Backend (Node.js/Express.js) đến giao diện người dùng (React.js/Mobile) là bắt buộc để chứng minh năng lực thực thi độc lập.

**Khế ước sử dụng AI (AI Usage Contract)**

Dự án khuyến khích sử dụng ChatGPT, GitHub Copilot và PlantUML như những công cụ tăng năng suất, nhưng phải tuân thủ các nguyên tắc sau:

1.  **Minh bạch (Transparency):** Duy trì "Prompt List" cho mỗi tính năng. Sinh viên phải lưu trữ lịch sử tương tác với AI để phục vụ việc thẩm định logic.
2.  **Năng lực làm chủ (Explainability):** Sinh viên phải có khả năng giải thích tường tận các cấu trúc do AI sinh ra, đặc biệt là các logic phức tạp trong GradingJob hay cơ chế AiApiKey rotation.
3.  **Tùy biến (Customization):** Mã nguồn sinh ra bởi AI phải được tinh chỉnh để phù hợp với chuẩn Clean Architecture và cấu trúc thư mục quy định của dự án AITA.

**Nguyên tắc đạo đức AI:** "AI là công cụ hỗ trợ tư duy, không phải thực thể thay thế trách nhiệm chuyên môn. Mọi dòng code do máy sinh ra đều phải được xác thực trong Sandbox và được bảo vệ bởi trí tuệ con người."

Sự rõ ràng trong quy tắc ứng xử này sẽ là tiền đề vững chắc để sinh viên bước vào giai đoạn thực thi kỹ thuật đầy thử thách thông qua các Research Spikes chuyên sâu.

**3\. Lộ trình 10 tuần: Từ Nghiên cứu đến Thực thi (The RBL Roadmap)**

Giai đoạn **Research Spikes** trong lộ trình RBL đóng vai trò then chốt trong việc giảm thiểu rủi ro kỹ thuật. Đối với một hệ thống phức tạp như AITA, việc nghiên cứu sâu về sandbox bảo mật và hàng đợi xử lý trước khi thực hiện thiết kế chi tiết là điều kiện bắt buộc để đảm bảo tính khả thi của hệ thống.

**Bảng lộ trình thực thi 10 tuần:**

Tuần

Hoạt động chính

Deliverables (Sản phẩm bàn giao)

Ghi chú Peer-to-Peer Audit

**1-2**

**Research Spikes:** Nghiên cứu 5 mũi nhọn (Docker Sandbox, Semantic Assessment, Redis Queue, Git API, Vision AI).

Báo cáo nghiên cứu kỹ thuật & POC (Proof of Concept).

Thiết lập cấu trúc Git & Nhánh.

**3-4**

**Phân tích & Thiết kế:** Thu thập yêu cầu, xây dựng Use Case và Prototypes.

**Evaluation 1:** SRS & Project Plan.

**Audit 1:** Sinh viên phản biện chéo logic Use Case.

**5-6**

**Kiến trúc & Hệ thống:** Thiết kế ERD, Class Diagram, cấu trúc PromptTemplate.

**Evaluation 2:** SDD & Database Schema.

**Audit 2:** Kiểm tra tính logic của Database Design.

**7-8**

**Thực thi Giai đoạn 1:** Phát triển Identity (JWT/RBAC) và Quản lý nộp bài.

Core Implementation (Phase 1).

Code Review chéo giữa các nhóm.

**9**

**Thực thi Giai đoạn 2:** Tích hợp AI Grading, Background Jobs và Sandbox.

Extended Features (Phase 2).

**Audit 3:** Final Peer-check trước bảo vệ.

**10**

**Tích hợp & Bảo vệ:** Kiểm thử hệ thống, đóng gói và thuyết trình cuối kỳ.

Sản phẩm hoàn thiện & Tài liệu hướng dẫn.

Hội đồng thẩm định chuyên môn.

**Lưu ý về Peer-to-Peer Audit (Chuẩn Đại học 42):** Đây là mô hình học tập cộng tác đỉnh cao. Trước khi giảng viên đánh giá, các thành viên phải thực hiện kiểm tra chéo (Audit) lẫn nhau. Sinh viên phải giải thích logic của mình cho đồng nghiệp; nếu không thuyết phục được đồng nghiệp về mặt kỹ thuật, module đó chưa đạt yêu cầu để chuyển sang giai đoạn tiếp theo.

**4\. Hệ thống Đánh giá Quá trình (Ongoing Assessment - 40%)**

Đánh giá liên tục không chỉ giúp kiểm soát chất lượng phần mềm ngay từ giai đoạn sơ khởi mà còn đảm bảo tính công bằng tuyệt đối. Kết quả từng giai đoạn là minh chứng cho nỗ lực nghiên cứu bền bỉ của sinh viên thay vì chỉ tập trung vào sản phẩm cuối cùng.

**Evaluation 1 (Tuần 4 - 20%): Phân tích & Mô hình hóa**

Tập trung vào khả năng chuyển hóa bài toán nghiệp vụ AITA thành kiến trúc phần mềm.

*   \[ \] Xác định chính xác Actors (Admin, Lecturer, Student) và sơ đồ Use Case toàn diện.
*   \[ \] Thiết kế Screen Flow chi tiết cho Web Dashboard và Mobile App.
*   \[ \] Chứng minh tính minh bạch qua danh sách AI Prompts sử dụng trong giai đoạn SRS.

**Evaluation 2 (Tuần 6 - 20%): Kiến trúc & Thiết kế Kỹ thuật**

Yêu cầu sinh viên thể hiện năng lực thiết kế hệ thống có khả năng mở rộng (Scalability).

*   \[ \] **Database Design:** Thiết kế ERD chuẩn hóa với các thực thể then chốt: GradingJob (có priority), RubricRule, AiApiKey (cơ chế rotation).
*   \[ \] **AI Infrastructure:** Xây dựng cấu trúc PromptTemplate engine và giải trình logic của AI Grading Pipeline.
*   \[ \] **Mastery:** Giải trình chi tiết các "Code stubs" hoặc cấu trúc thư mục do AI gợi ý, chứng minh sự tuân thủ Clean Architecture và sử dụng Prisma ORM hiệu quả.

**5\. Đánh giá Cuối kỳ & Thẩm định Năng lực cá nhân (60%)**

Sản phẩm cuối cùng của dự án AITA không chỉ là một phần mềm vận hành trơn tru, mà là bản tuyên ngôn về năng lực nghiên cứu, thực thi và bảo vệ giải pháp của mỗi cá nhân trước những tiêu chuẩn kỹ thuật khắt khe nhất.

**Cấu trúc điểm 60% được phân bổ như sau:**

1.  **Trình diễn sản phẩm tích hợp (30%):** Thẩm định sự ổn định của quy trình: Nộp bài → Trích xuất Artifact → Sandbox Execution → AI Code Review → Trả kết quả.
2.  **Làm chủ công việc (20%):** Khả năng giải trình logic cá nhân và thực hiện **Live Debugging** trực tiếp trước hội đồng để chứng minh tính chính chủ của mã nguồn.
3.  **Kỹ năng mềm & Thái độ (10%):** Đánh giá qua lịch sử Commit trên GitHub và tinh thần cộng tác qua hệ thống Plane.

**Rubric định nghĩa mức độ hoàn thành (Mastery Rubric):**

Mức độ

Tiêu chí hoàn thành chuyên môn

**Xuất sắc (9-10)**

Giải trình sâu sắc logic code; tối ưu hóa được Prompt AI; **Thực hiện Live Debugging/Fix bug tại chỗ** thành công khi có yêu cầu từ hội đồng.

**Tốt (7-8)**

Hiểu rõ luồng dữ liệu của module cá nhân; giải thích được sự tương tác giữa Frontend và Backend (API, JWT).

**Đạt (5-6)**

Module vận hành được các tính năng cơ bản; giải thích được logic chính nhưng còn lúng túng ở các phần phức tạp do AI sinh ra.

**Không đạt (<5)**

Không giải thích được code cá nhân; có dấu hiệu sao chép mã nguồn mà không hiểu bản chất.

Kết quả cuối cùng sẽ là sự tổng hòa giữa chất lượng sản phẩm công nghệ và bản lĩnh của người kỹ sư phần mềm tương lai.

**6\. Rubric Đánh giá Sử dụng AI & Điều kiện Tiên quyết**

Trong môi trường RBL, kỹ năng **"Customization" (Tinh chỉnh)** được định giá cao hơn kỹ năng "Prompting" đơn thuần. Một sinh viên giỏi không chỉ biết hỏi AI, mà phải biết biến những gợi ý của AI thành một phần hữu cơ, tối ưu và an toàn trong kiến trúc tổng thể của AITA.

**Bảng điểm AI Rubric (Tối đa 10 điểm):**

*   **Thấu hiểu (3đ):** Giải thích được lý do lựa chọn giải pháp mà AI đề xuất (ví dụ: tại sao chọn Redis cho hàng đợi chấm bài).
*   **Tinh chỉnh (3đ):** Mức độ can thiệp vào mã nguồn AI để áp dụng Clean Code, xử lý ngoại lệ và bảo mật.
*   **Minh bạch (2đ):** Nhật ký sử dụng AI (Prompt Logs) trung thực, rõ ràng theo từng mốc thời gian phát triển.
*   **Đạo đức (2đ):** Tuân thủ bản quyền mã nguồn, không lạm dụng AI để thay thế tư duy logic cốt lõi.

**ĐIỀU KIỆN TIÊN QUYẾT ĐỂ ĐƯỢC BẢO VỆ DỰ ÁN:**

*   **Điểm đánh giá quá trình (Ongoing Assessment) phải đạt tối thiểu 5/10.**
*   **Mọi mã nguồn phải được xác thực thông qua lịch sử Commit trên Git (đối chiếu hash SHA-256 nếu cần).**
*   **Tuyệt đối không có dấu hiệu gian lận hoặc sao chép mã nguồn từ các nguồn ngoài luồng không được khai báo.**

Tài liệu này là cam kết về sự chính trực học thuật và khát vọng chinh phục công nghệ của sinh viên Đại học FPT thông qua dự án AITA. Sự thành công của dự án sẽ là minh chứng cho sự kết hợp hoàn hảo giữa trí tuệ con người và sức mạnh của AI.