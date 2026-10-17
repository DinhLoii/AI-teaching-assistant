import { createRequire } from 'node:module'
import { inflateRawSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { readSubmissionFile } from './submission-storage.js'

const extensions = new Set(['kt','kts','java','cpp','c','h','hpp','cs','csproj','sln','py','js','jsx','ts','tsx','json','xml','gradle','properties','sql','html','css','scss','md','txt','yml','yaml','go','rs','php','vue','dart','swift'])
interface ArchiveEntry { entryName: string; isDirectory: boolean; attr: number; header: { size: number; method: number }; getCompressedData(): Buffer }
const AdmZip = createRequire(import.meta.url)('adm-zip') as new (buffer: Buffer) => { getEntries(): ArchiveEntry[] }
export function inspectSourceArchive(buffer: Buffer) {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  if (entries.length > 10000) throw new Error('ZIP có quá nhiều mục.')
  const files: { path: string; content: string }[] = []
  let bytes = 0, skipped = 0
  for (const entry of entries) {
    const name = entry.entryName.replaceAll('\\', '/')
    if (name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..') || ((entry.attr >>> 16) & 0xf000) === 0xa000) throw new Error('ZIP chứa đường dẫn hoặc liên kết không hợp lệ.')
    if (entry.isDirectory) continue
    if (/(^|\/)(\.git|node_modules|build|dist|bin|obj|\.gradle|vendor|__MACOSX)(\/|$)/.test(name) || !extensions.has(name.split('.').pop()?.toLowerCase() || '')) { skipped++; continue }
    if (entry.header.size > 2 * 1024 * 1024 || files.length >= 250 || bytes + entry.header.size > 10 * 1024 * 1024) { skipped++; continue }
    const compressed = entry.getCompressedData()
    const data = entry.header.method === 0 ? compressed : entry.header.method === 8 ? inflateRawSync(compressed, { maxOutputLength: 2 * 1024 * 1024 }) : null
    if (!data || data.length !== entry.header.size) throw new Error('Dữ liệu ZIP không hợp lệ hoặc không hỗ trợ.')
    if (data.length > 2 * 1024 * 1024 || data.includes(0)) { skipped++; continue }
    bytes += data.length
    files.push({ path: name, content: data.toString('utf8') })
  }
  return { archiveSha256: createHash('sha256').update(buffer).digest('hex'), files, skipped }
}

export async function readSubmissionArchive(url: string) {
  return inspectSourceArchive(await readSubmissionFile(url))
}
