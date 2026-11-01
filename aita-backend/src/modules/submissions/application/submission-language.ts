import path from 'node:path'
import fs from 'node:fs/promises'
import { ValidationError } from '../../../shared/application/app.error.js'

const sourceLanguages: Record<string, string> = { c: 'C', cpp: 'C++', cc: 'C++', cxx: 'C++', java: 'Java', py: 'Python', cs: 'C#', kt: 'Kotlin', kts: 'Kotlin', js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', sql: 'SQL', go: 'Go', rs: 'Rust', dart: 'Dart', swift: 'Swift', php: 'PHP' }
const ignored = /(^|\/)(?:node_modules|vendor|\.git|build|dist|bin|obj|\.gradle|__MACOSX)(\/|$)/
/** Question source filenames override the legacy single-program main.c default. */
export function questionSourceFiles(config: Record<string, any>, description = ''): string[] {
  const declared: unknown[] = [...(Array.isArray(config.submissionFormat?.entryFiles) ? config.submissionFormat.entryFiles : [])]
  for (const test of Array.isArray(config.testCases) ? config.testCases : []) declared.push(test.entryFile)
  for (const match of description.matchAll(/file\s+to\s+be\s+edited\s*:\s*([\w.-]+\.c)\b/gi)) declared.push(match[1])
  return [...new Set(declared.filter((file): file is string => typeof file === 'string' && /^Q[1-9]\d*\.(?:c|sql)$/.test(file)))]
}

export function examConfiguration(exam: Record<string, unknown> | null | undefined): Record<string, any> {
  const raw = exam?.aiGeneratedContent ?? exam?.AiGeneratedContent
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const config = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    const entryFiles = questionSourceFiles(config, String(exam?.description ?? exam?.Description ?? ''))
    if (entryFiles.length) config.submissionFormat = { ...config.submissionFormat, entryFiles, entryFile: '' }
    return config
  } catch { return {} }
}
export function canonicalSubmissionLanguage(value: unknown): string | undefined {
  const name = String(value || '').trim().toLowerCase()
  const aliases: Record<string, string> = { cpp: 'C++', cxx: 'C++', csharp: 'C#', python3: 'Python', nodejs: 'JavaScript' }
  return aliases[name] || Object.values(sourceLanguages).find(language => language.toLowerCase() === name)
}
export function assertSubmissionLanguage(config: Record<string, any>, paths: string[]) {
  const required = canonicalSubmissionLanguage(config.submissionFormat?.requiredLanguage || config.runtimeConfig?.language || config.requiredLanguage || config.language)
  if (!required) return // Legacy assignments without a declared language remain compatible.
  const sources = paths.filter(file => !ignored.test(file.replaceAll('\\', '/')))
    .map(file => ({ file, language: file.endsWith('.C') ? 'C++' : sourceLanguages[path.extname(file).slice(1).toLowerCase()] }))
    .filter(item => item.language)
  if (!sources.some(item => item.language === required)) {
    const found = [...new Set(sources.map(item => item.language))].join(', ') || 'không có mã nguồn phù hợp'
    throw new ValidationError(`Sai ngôn ngữ bài nộp: đề yêu cầu ${required}, ZIP chứa ${found}. Vui lòng nộp mã nguồn đúng ngôn ngữ; bài chưa được chấm điểm.`)
  }
  const questionFiles = questionSourceFiles(config)
  if (['C','SQL'].includes(required) && questionFiles.length) {
    if (!sources.some(item => item.language === required && questionFiles.includes(path.posix.basename(item.file.replaceAll('\\', '/'))))) {
      throw new ValidationError('ZIP chưa có file bài làm theo đề. Cần có một trong các tệp: ' + questionFiles.join(', ') + '.')
    }
    return
  }
  const entry = config.submissionFormat?.entryFile
  if (typeof entry === 'string' && entry.trim() && !sources.some(item => item.language === required && path.posix.basename(item.file.replaceAll('\\', '/')) === path.posix.basename(entry.replaceAll('\\', '/')))) {
    throw new ValidationError(`Bài nộp thiếu tệp đầu vào ${entry} theo cấu hình của giảng viên.`)
  }
}
export async function assertDirectorySubmissionLanguage(config: Record<string, any>, root: string) {
  if (!canonicalSubmissionLanguage(config.submissionFormat?.requiredLanguage || config.runtimeConfig?.language || config.requiredLanguage || config.language)) return
  const paths: string[] = []
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      const relative = path.relative(root, full).replaceAll('\\', '/')
      if (ignored.test(relative) || entry.isSymbolicLink()) continue
      if (entry.isDirectory()) await walk(full)
      else paths.push(relative)
      if (paths.length > 10000) throw new ValidationError('Bài nộp có quá nhiều tệp để xác minh ngôn ngữ.')
    }
  }
  await walk(root)
  assertSubmissionLanguage(config, paths)
}
