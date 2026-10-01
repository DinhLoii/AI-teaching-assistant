import { createRequire } from 'module'
import path from 'path'
import mammoth from 'mammoth'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
// adm-zip ships no type declarations; required rather than imported so this file
// does not need @ts-nocheck the way the older grading helpers do.
const AdmZip = require('adm-zip')

interface ZipEntry {
  entryName: string
  isDirectory: boolean
  getData(): Buffer
}

/** Source/text files worth comparing. Anything else in the archive is ignored. */
const COMPARABLE_EXT = new Set([
  '.c', '.cc', '.cpp', '.h', '.hpp', '.cs', '.java', '.kt', '.swift', '.dart',
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.php', '.rb', '.go', '.rs',
  '.sql', '.html', '.htm', '.css', '.scss', '.json', '.xml', '.md', '.txt',
])

/** Build output and dependency folders — shared boilerplate would fake a high score. */
const IGNORED_SEGMENTS = [
  'node_modules', '.git', '/bin/', '/obj/', '/dist/', '/build/', '/out/',
  'packages/', 'vendor/', '__pycache__', '.venv', 'venv/', '.next/', 'target/',
]

// Winnowing over a TOKEN stream, not raw characters: k is how many consecutive
// tokens must match for a fingerprint to survive, w is the window one fingerprint
// is selected from. Token-level is what makes renaming a variable useless as a
// disguise — char-level k-grams score a renamed copy at 0%.
const KGRAM = 12
const WINDOW = 6
const HASH_MOD = 1_000_000_007
const HASH_BASE = 257

/**
 * Reserved words worth preserving across the languages this course uses. Anything
 * outside this set is a name the student chose, so it collapses to a placeholder and
 * renaming it changes nothing.
 */
const KEYWORDS = new Set([
  'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
  'continue', 'return', 'goto', 'try', 'catch', 'finally', 'throw', 'throws',
  'new', 'delete', 'this', 'self', 'super', 'null', 'nil', 'none', 'true', 'false',
  'class', 'struct', 'enum', 'interface', 'extends', 'implements', 'abstract',
  'public', 'private', 'protected', 'static', 'final', 'const', 'let', 'var',
  'function', 'def', 'lambda', 'void', 'int', 'long', 'short', 'char', 'float',
  'double', 'bool', 'boolean', 'string', 'str', 'list', 'dict', 'map', 'set',
  'vector', 'array', 'unsigned', 'signed', 'import', 'include', 'from', 'package',
  'using', 'namespace', 'export', 'async', 'await', 'yield', 'in', 'is', 'not',
  'and', 'or', 'print', 'printf', 'scanf', 'cout', 'cin', 'select', 'insert',
  'update', 'delete', 'where', 'join', 'group', 'order', 'by', 'having', 'values',
])

/** Normalized text is capped so one huge archive cannot stall the whole report. */
const MAX_CORPUS_CHARS = 400_000

export interface SubmissionFingerprint {
  /** sha256-independent: null when nothing comparable could be read out of the file. */
  prints: Set<number> | null
  /** Characters of normalized text the prints were built from — used to explain empty results. */
  size: number
}

/**
 * Pull comparable text out of a submission file. Zip archives are read in memory:
 * entries are sorted by name so the same archive always yields the same corpus.
 */
export async function extractCorpus(buffer: Buffer, fileName: string): Promise<string> {
  const ext = path.extname(fileName.split('?')[0]).toLowerCase()

  if (ext === '.zip' || ext === '.rar' || ext === '.7z' || isZipBuffer(buffer)) {
    try {
      const zip = new AdmZip(buffer)
      const entries = (zip.getEntries() as ZipEntry[])
        .filter((e: ZipEntry) => !e.isDirectory)
        .filter((e: ZipEntry) => {
          const name = '/' + e.entryName.replace(/\\/g, '/').toLowerCase()
          if (IGNORED_SEGMENTS.some(seg => name.includes(seg))) return false
          return COMPARABLE_EXT.has(path.extname(name))
        })
        .sort((a: ZipEntry, b: ZipEntry) => a.entryName.localeCompare(b.entryName))

      let out = ''
      for (const entry of entries) {
        if (out.length >= MAX_CORPUS_CHARS) break
        try {
          out += entry.getData().toString('utf8') + '\n'
        } catch {
          // A single unreadable entry must not lose the rest of the archive.
        }
      }
      return out
    } catch {
      return ''
    }
  }

  if (ext === '.pdf') {
    try {
      const data = await pdfParse(buffer)
      return String(data?.text ?? '')
    } catch {
      return ''
    }
  }

  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return String(result?.value ?? '')
    } catch {
      return ''
    }
  }

  try {
    return buffer.toString('utf8')
  } catch {
    return ''
  }
}

function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b
}

/**
 * Strip everything a student can change without doing any work: comments, string
 * contents, whitespace and letter case. What survives is the structure of the code.
 */
export function normalizeSource(text: string): string {
  let out = text.slice(0, MAX_CORPUS_CHARS * 3)
  out = out.replace(/\/\*[\s\S]*?\*\//g, ' ')      // /* block */
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')  // // line, but not the // in a URL
  out = out.replace(/<!--[\s\S]*?-->/g, ' ')       // html
  out = out.replace(/^[ \t]*#[^\n]*/gm, ' ')       // # line (python/shell)
  out = out.replace(/--[^\n]*/g, ' ')              // sql
  out = out.replace(/"(?:[^"\\]|\\.)*"/g, '""')    // string bodies carry no structure
  out = out.replace(/'(?:[^'\\]|\\.)*'/g, "''")
  out = out.toLowerCase().replace(/\s+/g, ' ').trim()
  return out.slice(0, MAX_CORPUS_CHARS)
}

/**
 * Split normalized source into a language-agnostic token stream. Reserved words and
 * operators survive verbatim because they carry the structure; identifiers, numbers
 * and string bodies collapse to placeholders because a student can rename those
 * freely without changing what the program does.
 */
export function tokenize(normalized: string): number[] {
  const tokens: number[] = []
  const pattern = /[a-z_][a-z0-9_]*|\d+(?:\.\d+)?|[^\sa-z0-9_]/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(normalized)) !== null) {
    const raw = match[0]
    let token: string
    if (/^[a-z_]/.test(raw)) {
      token = KEYWORDS.has(raw) ? raw : 'v'
    } else if (/^\d/.test(raw)) {
      token = 'n'
    } else {
      token = raw
    }
    // FNV-1a, kept inside the modulus so the rolling hash below stays exact.
    let h = 2166136261
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    tokens.push(Math.abs(h) % HASH_MOD)
  }
  return tokens
}

/**
 * Winnowing fingerprints of the token stream: hash every k-gram of tokens, then keep
 * the smallest hash in each sliding window. Two files that share a passage share the
 * fingerprints for it regardless of where in the file it sits.
 */
export function fingerprint(normalized: string): SubmissionFingerprint {
  const tokens = tokenize(normalized)
  if (tokens.length < KGRAM) {
    return { prints: null, size: tokens.length }
  }

  const hashes: number[] = []
  let hash = 0
  let highestPower = 1
  for (let i = 0; i < KGRAM; i++) {
    hash = (hash * HASH_BASE + tokens[i]) % HASH_MOD
    if (i > 0) highestPower = (highestPower * HASH_BASE) % HASH_MOD
  }
  hashes.push(hash)

  for (let i = KGRAM; i < tokens.length; i++) {
    const leaving = tokens[i - KGRAM] * highestPower % HASH_MOD
    hash = (hash - leaving + HASH_MOD) % HASH_MOD
    hash = (hash * HASH_BASE + tokens[i]) % HASH_MOD
    hashes.push(hash)
  }

  const prints = new Set<number>()
  if (hashes.length <= WINDOW) {
    prints.add(Math.min(...hashes))
    return { prints, size: tokens.length }
  }

  // One fingerprint per window: the minimum, rightmost on ties (standard winnowing).
  let lastSelected = -1
  for (let i = 0; i + WINDOW <= hashes.length; i++) {
    let minIdx = i
    for (let j = i; j < i + WINDOW; j++) {
      if (hashes[j] <= hashes[minIdx]) minIdx = j
    }
    if (minIdx !== lastSelected) {
      prints.add(hashes[minIdx])
      lastSelected = minIdx
    }
  }

  return { prints, size: tokens.length }
}

/** Jaccard overlap of two fingerprint sets, as a 0-100 percentage rounded to 1dp. */
export function similarityPercent(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 || b.size === 0) return 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const value of small) {
    if (large.has(value)) shared++
  }
  const union = a.size + b.size - shared
  if (union === 0) return 0
  return Math.round((shared / union) * 1000) / 10
}
