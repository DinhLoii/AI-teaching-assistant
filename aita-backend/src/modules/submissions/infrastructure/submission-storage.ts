import fs from 'node:fs/promises'
import path from 'node:path'
import type { RequestHandler } from 'express'

const maxBytes = 100 * 1024 * 1024
export const privateSubmissionRoot = () => path.resolve(process.env.PRIVATE_SUBMISSION_DIR || 'storage/submissions')

export async function resolveSubmissionFile(url: string): Promise<string> {
  const pathname = url.split('?')[0]
  let root: string, relative: string
  if (pathname.startsWith('/private-submissions/')) {
    root = privateSubmissionRoot(); relative = pathname.slice('/private-submissions/'.length)
  } else if (pathname.startsWith('/uploads/') && /\.zip$/i.test(pathname)) {
    root = path.resolve('uploads'); relative = pathname.slice('/uploads/'.length)
  } else throw new Error('Vị trí bài nộp không hợp lệ.')
  root = await fs.realpath(root)
  const filename = await fs.realpath(path.resolve(root, relative))
  if (!filename.startsWith(root + path.sep)) throw new Error('Vị trí bài nộp không hợp lệ.')
  if ((await fs.stat(filename)).size > maxBytes) throw new Error('ZIP quá lớn.')
  return filename
}

export async function readSubmissionFile(url: string): Promise<Buffer> {
  if (!/^https?:/i.test(url)) return fs.readFile(await resolveSubmissionFile(url))
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || parsed.username || parsed.password) throw new Error('Kho lưu trữ bài nộp không hợp lệ.')
  const response = await fetch(parsed, { signal: AbortSignal.timeout(30000), redirect: 'error' })
  if (!response.ok || !response.body) throw new Error('Không đọc được ZIP đã lưu.')
  const reader = response.body.getReader()
  const chunks: Buffer[] = []; let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) throw new Error('ZIP quá lớn.')
      chunks.push(Buffer.from(value))
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  return Buffer.concat(chunks)
}

/** Close old public URLs too; new archives never live under express.static. */
export const protectSubmissionUploads: RequestHandler = (req, res, next) => {
  let pathname = req.path
  try { pathname = decodeURIComponent(pathname) } catch { res.status(400).end(); return }
  pathname = path.posix.normalize('/' + pathname.replaceAll('\\', '/'))
  if (/^\/submissions(?:\/|$)/i.test(pathname) || /\.zip$/i.test(pathname)) { res.status(404).end(); return }
  next()
}
