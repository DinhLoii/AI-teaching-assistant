/**
 * Unit Tests for Cloudinary Path Utility
 * Guards the sanitizer against the characters Cloudinary rejects in a public_id.
 */

import { describe, test, expect } from '@jest/globals'
import { sanitizeCloudinaryPathSegment, buildCloudinaryFolder } from './cloudinary-path.util.js'

describe('CloudinaryPathUtil', () => {
    describe('sanitizeCloudinaryPathSegment', () => {
        test('strips every character Cloudinary forbids', () => {
            const result = sanitizeCloudinaryPathSegment('a?b&c#d\\e%f<g>h+i')
            expect(result).not.toMatch(/[?&#\\%<>+]/)
        })

        test('fixes the real-world title that broke the upload', () => {
            const result = sanitizeCloudinaryPathSegment(
                'Assignment 1 (ASS1) - DBI202: Advanced Database Systems & Programming'
            )
            expect(result).not.toMatch(/[?&#\\%<>+]/)
            expect(result).toContain('Assignment_1')
            expect(result).toContain('DBI202')
        })

        test('folds Vietnamese diacritics to readable ASCII', () => {
            expect(sanitizeCloudinaryPathSegment('Lập trình hướng đối tượng'))
                .toBe('Lap_trinh_huong_doi_tuong')
        })

        test('leaves an already-safe segment untouched', () => {
            expect(sanitizeCloudinaryPathSegment('DBI202')).toBe('DBI202')
            expect(sanitizeCloudinaryPathSegment('SE18C02')).toBe('SE18C02')
        })

        test('collapses runs of underscores instead of emitting ___', () => {
            expect(sanitizeCloudinaryPathSegment('a   &&&   b')).toBe('a_b')
        })

        test('never returns a leading or trailing separator', () => {
            expect(sanitizeCloudinaryPathSegment('  ...weird...  ')).toBe('weird')
        })

        test('falls back when the input sanitizes down to nothing', () => {
            expect(sanitizeCloudinaryPathSegment('&&&')).toBe('untitled')
            expect(sanitizeCloudinaryPathSegment('')).toBe('untitled')
            expect(sanitizeCloudinaryPathSegment(null)).toBe('untitled')
            expect(sanitizeCloudinaryPathSegment(undefined)).toBe('untitled')
            expect(sanitizeCloudinaryPathSegment('   ', 'UnknownSubject')).toBe('UnknownSubject')
        })

        test('caps segment length so the full public_id stays under Cloudinary limits', () => {
            expect(sanitizeCloudinaryPathSegment('x'.repeat(500)).length).toBeLessThanOrEqual(80)
        })

        test('removes path separators so a segment cannot escape its folder', () => {
            expect(sanitizeCloudinaryPathSegment('../../etc/passwd')).not.toContain('/')
            expect(sanitizeCloudinaryPathSegment('a/b')).toBe('a_b')
        })
    })

    describe('buildCloudinaryFolder', () => {
        test('joins and sanitizes each segment', () => {
            expect(buildCloudinaryFolder('AITA', 'DBI202', 'A & B')).toBe('AITA/DBI202/A_B')
        })

        test('drops empty segments rather than inserting a fallback', () => {
            expect(buildCloudinaryFolder('AITA', '', null, 'X')).toBe('AITA/X')
        })

        test('produces a folder free of forbidden characters end to end', () => {
            const folder = buildCloudinaryFolder(
                'AITA',
                'DBI202',
                'SE18C02',
                'Assignment 1 (ASS1) - DBI202: Advanced Database Systems & Programming'
            )
            expect(folder).not.toMatch(/[?&#\\%<>+]/)
            expect(folder.split('/')).toHaveLength(4)
        })
    })
})
