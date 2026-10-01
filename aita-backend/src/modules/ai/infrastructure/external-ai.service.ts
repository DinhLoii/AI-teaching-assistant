import { env } from '../../../config/env.js'
import type {
    IAIService,
    GenerateExerciseInput,
    GenerateExerciseOutput,
    AssessInput,
    AssessOutput,
    LearningFeedbackOutput,
    GenerateRubricInput,
    GenerateRubricOutput,
    GeneratePromptTemplateInput,
    GeneratePromptTemplateOutput,
    RefinePromptTemplateInput
} from '../../../shared/application/ports/ai-service.interface.js'
import { AiClientManager } from '../../grading/engine/infrastructure/ai/AiClientManager.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class ExternalAiService implements IAIService {
    async generateExercise(input: GenerateExerciseInput): Promise<GenerateExerciseOutput> {
        if (env.AI_STUB_MODE) {
            await wait(800)
            const type = input.type ?? 'coding'
            const topic = input.topic ?? 'Topic'
            return {
                title: `[AI] Bài tập ${type}: ${topic}`,
                description: `Độ khó ${input.difficulty ?? 'medium'}`,
                content: { type, topic, stub: true },
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/generate-exercise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async assess(input: AssessInput): Promise<AssessOutput> {
        if (env.AI_STUB_MODE) {
            await wait(1000)
            const aiScore = Math.round((7 + Math.random() * 2) * 10) / 10
            return {
                aiScore,
                feedback: {
                    testCases: { passed: 4, total: 5 },
                    codingStyle: 'Đặt tên biến rõ ràng.',
                    logic: 'Logic đúng happy path.',
                    performance: 'Ổn.',
                    suggestions: ['Thêm unit test'],
                    language: input.language,
                    length: input.content.length,
                },
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/assess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async learningFeedback(studentId: string): Promise<LearningFeedbackOutput> {
        if (env.AI_STUB_MODE) {
            await wait(500)
            return {
                studentId,
                weakTopics: ['Unit Testing', 'Design Patterns'],
                recommendations: [
                    { type: 'reading', title: 'JUnit Best Practices' },
                    { type: 'practice', title: 'REST API Lab' },
                ],
            }
        }

        const response = await fetch(`${env.AI_ENDPOINT}/learning-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId }),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async generateRubric(input: GenerateRubricInput): Promise<GenerateRubricOutput> {
        if (env.AI_STUB_MODE) {
            await wait(1000)
            const total = input.totalScore || 10

            const fileNotice = input.file ? ` (Dựa trên file: ${input.file.filename})` : ''

            return {
                criteria: [
                    { name: 'Tính đúng đắn (Logic)' + fileNotice, description: 'Chương trình chạy đúng yêu cầu cơ bản.', maxScore: total * 0.4 },
                    { name: 'Chất lượng mã (Code Quality)', description: 'Mã nguồn dễ đọc, chuẩn naming convention.', maxScore: total * 0.3 },
                    { name: 'Hiệu suất (Performance)', description: 'Sử dụng thuật toán và cấu trúc dữ liệu tối ưu.', maxScore: total * 0.3 }
                ],
                totalScore: total
            }
        }

        let body: any;
        let headers: any = {};

        if (input.file) {
            const formData = new FormData();
            formData.append('topic', input.topic);
            if (input.difficulty) formData.append('difficulty', input.difficulty);
            if (input.totalScore) formData.append('totalScore', input.totalScore.toString());

            const blob = new Blob([input.file.buffer as any], { type: input.file.mimetype });
            formData.append('file', blob, input.file.filename);

            body = formData;
            // browser/node-fetch will automatically set multipart/form-data boundary
        } else {
            body = JSON.stringify({
                topic: input.topic,
                difficulty: input.difficulty,
                totalScore: input.totalScore
            });
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${env.AI_ENDPOINT}/generate-rubric`, {
            method: 'POST',
            headers,
            body,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            throw new Error(`AI Microservice error: ${errorText}`)
        }

        return response.json()
    }

    async generatePromptTemplate(input: GeneratePromptTemplateInput): Promise<GeneratePromptTemplateOutput> {
        const subject = input.subjectCode || 'môn học';
        const name = input.name || 'Bài kiểm tra';
        const category = input.category || 'Thực hành';
        const lang = input.language === 'en' ? 'English' : 'Tiếng Việt';

        // ── Build category-specific meta-prompt ──
        let metaPrompt = '';

        if (category === 'Trắc nghiệm') {
            metaPrompt = this.buildMCQMetaPrompt(subject, name, input, lang);
        } else {
            metaPrompt = this.buildPracticeMetaPrompt(subject, name, input, lang);
        }

        const result = await AiClientManager.executeWithFallback(async (client, model) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: metaPrompt }],
                temperature: 0.65
            });
            return response.choices[0].message.content || '';
        });

        return { prompt: result.trim() };
    }

    /**
     * Meta-prompt cho loại Trắc nghiệm (MCQ)
     */
    private buildMCQMetaPrompt(subject: string, name: string, input: GeneratePromptTemplateInput, lang: string): string {
        const topicHint = input.topic ? `về chủ đề "${input.topic}"` : '';
        const difficultyHint = input.difficulty ? `ở mức độ "${input.difficulty}"` : '';
        const countHint = input.questionCount ? `gồm ${input.questionCount} câu` : '';

        let prompt = `Bạn là chuyên gia Prompt Engineering trong lĩnh vực giáo dục đại học.

NHIỆM VỤ: Viết một System Prompt hoàn chỉnh mà giảng viên sẽ gửi cho AI (ChatGPT/Gemini) để AI tạo ra đề thi trắc nghiệm cho môn "${subject}".
Tên đề thi: "${name}" ${countHint} ${topicHint} ${difficultyHint}.

`;

        if (input.draftContent && input.draftContent.trim()) {
            prompt += `Giảng viên đã phác thảo ý tưởng sơ bộ:
"""
${input.draftContent}
"""
Hãy mở rộng và hoàn thiện ý tưởng trên thành System Prompt chuyên nghiệp.

`;
        }

        prompt += `SYSTEM PROMPT CẦN TẠO PHẢI BAO GỒM:

1. VAI TRÒ: Gán cho AI vai trò giảng viên/chuyên gia ra đề môn ${subject}
2. NHIỆM VỤ CỤ THỂ: Tạo đề trắc nghiệm với:
   - Số câu hỏi: ${input.questionCount || 10}
   - Chủ đề: ${input.topic || 'chung'}
   - Mức độ khó: ${input.difficulty || 'Trung bình'}
3. FORMAT MỖI CÂU HỎI:
   - Câu hỏi rõ ràng, có ngữ cảnh thực tế hoặc code snippet nếu phù hợp
   - 4 đáp án A/B/C/D (1 đúng, 3 nhiễu – các đáp án nhiễu phải hợp lý, không quá hiển nhiên sai)
   - Đáp án đúng + giải thích ngắn gọn
4. TIÊU CHÍ CHẤT LƯỢNG:
   - Phân bố mức Bloom: Remember/Understand/Apply/Analyze tùy theo {{difficulty}}
   - Không câu hỏi mơ hồ, tránh "tất cả đều đúng/sai"
   - Đáp án nhiễu phải là lỗi phổ biến sinh viên hay mắc
5. NGÔN NGỮ ĐẦU RA: ${lang}
`;

        if (input.additionalNotes && input.additionalNotes.trim()) {
            prompt += `6. YÊU CẦU BỔ SUNG: ${input.additionalNotes}\n`;
        }

        prompt += `
QUY TẮC:
- Chỉ trả về System Prompt hoàn chỉnh, KHÔNG giải thích, KHÔNG markdown code block
- Prompt phải gắn trực tiếp các giá trị số câu hỏi, chủ đề, độ khó (nếu có) thay vì dùng biến template.
- Prompt phải tự đủ để AI khác đọc và thực thi được ngay`;

        return prompt;
    }

    /**
     * Meta-prompt cho loại Thực hành / Lab / Coding
     */
    private buildPracticeMetaPrompt(subject: string, name: string, input: GeneratePromptTemplateInput, lang: string): string {
        const topicHint = input.topic ? `về chủ đề "${input.topic}"` : '';
        const difficultyHint = input.difficulty ? `ở mức độ "${input.difficulty}"` : '';
        const countHint = input.questionCount ? `gồm ${input.questionCount} bài` : '';

        let prompt = `Bạn là chuyên gia Prompt Engineering trong lĩnh vực giáo dục đại học, chuyên về lập trình và khoa học máy tính.

NHIỆM VỤ: Viết một System Prompt hoàn chỉnh mà giảng viên sẽ gửi cho AI (ChatGPT/Gemini) để AI tạo ra bài tập thực hành/lab cho môn "${subject}".
Tên bài tập: "${name}" ${countHint} ${topicHint} ${difficultyHint}.

`;

        if (input.draftContent && input.draftContent.trim()) {
            prompt += `Giảng viên đã phác thảo ý tưởng sơ bộ:
"""
${input.draftContent}
"""
Hãy mở rộng và hoàn thiện ý tưởng trên thành System Prompt chuyên nghiệp.

`;
        }

        prompt += `SYSTEM PROMPT CẦN TẠO PHẢI BAO GỒM:

1. VAI TRÒ: Gán cho AI vai trò giảng viên/chuyên gia ra đề thực hành môn ${subject}
2. NHIỆM VỤ CỤ THỂ: Tạo bài tập thực hành/coding với:
   - Số bài tập: ${input.questionCount || 5}
   - Chủ đề: ${input.topic || 'chung'}
   - Mức độ khó: ${input.difficulty || 'Trung bình'}
3. FORMAT MỖI BÀI TẬP PHẢI CÓ:
   a) Tên bài tập (ngắn gọn, mô tả rõ)
   b) Mô tả vấn đề / Đề bài chi tiết
   c) Yêu cầu kỹ thuật cụ thể:
      - Ngôn ngữ lập trình / cấu trúc dữ liệu cần sử dụng
      - Phân tích độ phức tạp thời gian (Time Complexity) và không gian (Space Complexity)
      - Constraint/giới hạn (kích thước input, thời gian chạy)
   d) Ví dụ Input/Output minh hoạ (ít nhất 2 test case cho mỗi bài)
   e) Gợi ý hướng giải (optional, tùy {{difficulty}})
4. TIÊU CHÍ CHẤT LƯỢNG:
   - Bài tập có tính ứng dụng thực tế, không thuần lý thuyết
   - Độ khó tăng dần trong tập bài
   - Có bài yêu cầu so sánh/tối ưu giải thuật
   - Test case bao gồm: happy path, edge case, large input
5. NGÔN NGỮ ĐẦU RA: ${lang}
`;

        if (input.additionalNotes && input.additionalNotes.trim()) {
            prompt += `6. YÊU CẦU BỔ SUNG: ${input.additionalNotes}\n`;
        }

        prompt += `
QUY TẮC:
- Chỉ trả về System Prompt hoàn chỉnh, KHÔNG giải thích, KHÔNG markdown code block
- Prompt phải gắn trực tiếp các giá trị số câu hỏi, chủ đề, độ khó (nếu có) thay vì dùng biến template.
- Prompt phải tự đủ để AI khác đọc và thực thi được ngay
- Với bài thực hành coding, yêu cầu AI tạo code skeleton/template cho sinh viên bắt đầu`;

        return prompt;
    }

    async refinePromptTemplate(input: RefinePromptTemplateInput): Promise<GeneratePromptTemplateOutput> {
        let systemPrompt = `Bạn là một chuyên gia Prompt Engineering. Hãy viết lại và tối ưu hoá đoạn System Prompt sau đây sao cho chuyên nghiệp, rõ ràng, và phù hợp để hệ thống AI (như ChatGPT/Gemini) có thể đọc hiểu và làm theo tốt nhất khi sinh đề thi.
Đoạn prompt gốc:
"""
${input.content}
"""
Chỉ trả về nội dung đã được chỉnh sửa, không giải thích thêm, không dùng markdown code block.`;

        const result = await AiClientManager.executeWithFallback(async (client, model) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: systemPrompt }],
                temperature: 0.7
            });
            return response.choices[0].message.content || '';
        });

        return { prompt: result.trim() };
    }
}
