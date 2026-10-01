/**
 * Unit tests for the project type detector.
 *
 * The regression these exist for: a DBI202 prompt asking students to analyse "Time Complexity"
 * and "Space Complexity" scored two algorithm signals and was rewritten to "algorithm", which
 * grades SQL work through a stdin/stdout judge.
 */

import { describe, test, expect } from '@jest/globals'
import { detectProjectType } from './ProjectTypeDetector.js'

const DBI202_PROMPT = `Bạn là giảng viên ra đề thực hành môn DBI202 về cơ sở dữ liệu.
Cung cấp một lược đồ cơ sở dữ liệu (schema) và mô tả các bảng cần thiết.
Chỉ định ngôn ngữ (SQL) và kỹ thuật cụ thể: stored procedures, triggers, indexing,
recursive CTEs, transaction management, query optimization techniques.
Phân tích độ phức tạp thời gian (Time Complexity) và không gian (Space Complexity).
Ít nhất một bài phải yêu cầu so sánh hoặc tối ưu câu truy vấn.`

const ALGORITHM_PROMPT = `Viết chương trình đọc input từ stdin gồm một mảng số nguyên, tìm subarray
có tổng lớn nhất và in ra màn hình kết quả. Phân tích time complexity, yêu cầu tốt hơn O(n^2).
Gợi ý: dynamic programming hoặc greedy.`

const FRONTEND_PROMPT = `Xây dựng giao diện quản lý sản phẩm bằng React, gọi API bằng fetch,
hiển thị danh sách dạng bảng, có phân trang và tìm kiếm. Yêu cầu responsive trên mobile.`

// An app that *uses* a database is not a SQL exercise. Both of these were relabelled
// "database" when the signal list still counted "cơ sở dữ liệu", "primary key", "transaction"
// and a bare "index" - the last one matching index.jsp.
const PRJ301_PROMPT = `Xây dựng ứng dụng web quản lý bán hàng bằng Java Servlet/JSP theo mô hình MVC.
Sinh viên phải kết nối cơ sở dữ liệu bằng JDBC, viết các truy vấn lấy danh sách sản phẩm.
Trang index.jsp hiển thị danh sách, có phân trang. Quản lý phiên đăng nhập bằng Session.
Yêu cầu transaction khi đặt hàng. Bảng Product có primary key, bảng Order có foreign key.`

const PRM392_PROMPT = `Xây dựng ứng dụng Android quản lý chi tiêu cá nhân.
Dùng Room database để lưu trữ giao dịch offline, đồng bộ với REST API khi có mạng.
Trigger cập nhật tổng chi tiêu mỗi khi thêm giao dịch mới.
Yêu cầu xử lý transaction khi chuyển tiền giữa hai ví.`

describe('detectProjectType with a subject', () => {
    // The subject code is the one deterministic signal: the lecturer picks it on the form.
    // Where a subject is mapped it settles projectType, and the keyword table is not consulted.

    test('DBI202 is a database subject whatever the AI says', () => {
        expect(detectProjectType('database', DBI202_PROMPT, 'DBI202').projectType).toBe('database')
        expect(detectProjectType('algorithm', DBI202_PROMPT, 'DBI202').projectType).toBe('database')
        expect(detectProjectType('backend', DBI202_PROMPT, 'DBI202').projectType).toBe('database')
    })

    test('PRJ301 keeps backend or fullstack, both of which are legitimate for it', () => {
        expect(detectProjectType('backend', PRJ301_PROMPT, 'PRJ301').changed).toBe(false)
        expect(detectProjectType('fullstack', PRJ301_PROMPT, 'PRJ301').changed).toBe(false)
    })

    test('PRJ301 cannot be a database assignment', () => {
        expect(detectProjectType('database', PRJ301_PROMPT, 'PRJ301').projectType).toBe('backend')
    })

    test('PRM392 keeps mobile and rejects database', () => {
        expect(detectProjectType('mobile', PRM392_PROMPT, 'PRM392').changed).toBe(false)
        expect(detectProjectType('database', PRM392_PROMPT, 'PRM392').projectType).toBe('mobile')
    })

    test('CSD201 is an algorithm subject', () => {
        expect(detectProjectType('backend', ALGORITHM_PROMPT, 'CSD201').projectType).toBe('algorithm')
    })

    test('accepts a class-suffixed or lowercase subject code', () => {
        expect(detectProjectType('algorithm', DBI202_PROMPT, 'DBI202-SE1701').projectType).toBe('database')
        expect(detectProjectType('algorithm', DBI202_PROMPT, 'dbi202').projectType).toBe('database')
    })

    test('an unmapped subject or a UUID falls back to keyword scoring', () => {
        // MLN111 has no policy, so the PRJ301 text is scored and nothing outscores backend.
        expect(detectProjectType('backend', PRJ301_PROMPT, 'MLN111').projectType).toBe('backend')
        expect(detectProjectType('mobile', PRM392_PROMPT, '9f0c1e2a-1111-2222-3333-444455556666').projectType).toBe('mobile')
    })
})

describe('detectProjectType', () => {
    describe('database prompts', () => {
        test('keeps "database" when the AI classified a DBI202 prompt correctly', () => {
            const result = detectProjectType('database', DBI202_PROMPT)
            expect(result.projectType).toBe('database')
            expect(result.changed).toBe(false)
        })

        test('rewrites to "database" when the AI called a SQL prompt an algorithm', () => {
            const result = detectProjectType('algorithm', DBI202_PROMPT)
            expect(result.projectType).toBe('database')
            expect(result.changed).toBe(true)
        })

        test('is not swayed by the two complexity-analysis mentions alone', () => {
            // The exact pair that used to be enough to force "algorithm".
            const result = detectProjectType('database', 'Phân tích Time Complexity và Space Complexity của câu truy vấn SQL trên bảng dữ liệu.')
            expect(result.projectType).toBe('database')
        })
    })

    describe('algorithm prompts', () => {
        test('still rewrites a mislabelled algorithm prompt, the case the fallback was written for', () => {
            const result = detectProjectType('backend', ALGORITHM_PROMPT)
            expect(result.projectType).toBe('algorithm')
            expect(result.changed).toBe(true)
        })

        test('leaves a correctly classified algorithm prompt alone', () => {
            const result = detectProjectType('algorithm', ALGORITHM_PROMPT)
            expect(result.projectType).toBe('algorithm')
            expect(result.changed).toBe(false)
        })
    })

    describe('apps that merely use a database', () => {
        test('leaves a PRJ301 Java web assignment as the AI classified it', () => {
            expect(detectProjectType('backend', PRJ301_PROMPT).projectType).toBe('backend')
            expect(detectProjectType('fullstack', PRJ301_PROMPT).projectType).toBe('fullstack')
        })

        test('leaves a PRM392 Android assignment as mobile', () => {
            const result = detectProjectType('mobile', PRM392_PROMPT)
            expect(result.projectType).toBe('mobile')
            expect(result.changed).toBe(false)
        })

        test('does not treat index.jsp as a database index', () => {
            expect(detectProjectType('backend', 'Trang index.jsp hiển thị danh sách sản phẩm.').changed).toBe(false)
        })

        test('does not treat a UI trigger or a money transfer transaction as SQL', () => {
            expect(detectProjectType('mobile', 'Trigger cập nhật giao diện sau mỗi transaction chuyển tiền.').changed).toBe(false)
        })
    })

    describe('everything else', () => {
        test('leaves a frontend prompt with no signals untouched', () => {
            const result = detectProjectType('frontend', FRONTEND_PROMPT)
            expect(result.projectType).toBe('frontend')
            expect(result.changed).toBe(false)
        })

        test('keeps the AI classification when neither side leads clearly', () => {
            const result = detectProjectType('backend', 'Dùng stdin và sql trong bài tập này.')
            expect(result.projectType).toBe('backend')
            expect(result.changed).toBe(false)
        })

        test('handles an empty prompt without throwing', () => {
            const result = detectProjectType('fullstack', '')
            expect(result.projectType).toBe('fullstack')
            expect(result.changed).toBe(false)
        })
    })
})
