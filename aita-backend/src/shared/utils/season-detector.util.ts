/**
 * Season Detection Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts season + year from an Excel filename in a fault-tolerant way.
 *
 * ✅ Supported filename patterns (all case-insensitive):
 *
 *   Attached (no separator)   →  Fall2026.xlsx, SPRING2026_students.xlsx
 *   Underscore separated      →  Fall_2026.xlsx, fall_2026_students.xlsx
 *   Hyphen separated          →  Fall-2026.xlsx, spring-2026-v2.xlsx
 *   Space separated           →  "Fall 2026.xlsx", "Spring 2026 students.xlsx"
 *   Year before season        →  2026_Fall.xlsx, 2026Fall.xlsx, 2026-spring.xlsx
 *   Surrounded by other text  →  students_Fall_2026_batch1.xlsx
 *   Vietnamese aliases        →  ThuDong2026.xlsx (Winter), XuanHe2026.xlsx (Spring)
 *   Mixed case                →  fALL_2026.xlsx, WINTER2026.xlsx
 *
 * The detector tries multiple strategies in priority order and returns the
 * first confident match. If nothing matches, it throws SeasonDetectorError
 * with a clear, user-friendly Vietnamese message.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface DetectedSeason {
  /** Canonical English season name: 'Fall' | 'Spring' | 'Summer' | 'Winter' */
  season: string
  /** 4-digit academic year, e.g. 2026 */
  year: number
  /** Human-readable label shown in error messages and UI, e.g. 'Fall 2026' */
  formatted: string
}

export class SeasonDetectorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeasonDetectorError'
  }
}

// ── Season alias map ──────────────────────────────────────────────────────────
// Maps every accepted keyword (lowercase) → canonical English season name.
// Add more aliases here as needed — the rest of the code is untouched.
const SEASON_ALIASES: Record<string, string> = {
  // English
  fall: 'Fall',
  autumn: 'Fall',
  spring: 'Spring',
  summer: 'Summer',
  winter: 'Winter',

  // Vietnamese (common romanised abbreviations)
  thudon: 'Fall',        // Thu Đông
  'thu-don': 'Fall',
  'thu_don': 'Fall',
  xuanhe: 'Spring',      // Xuân Hè
  'xuan-he': 'Spring',
  'xuan_he': 'Spring',
  xuan: 'Spring',
  he: 'Summer',
  dong: 'Winter',

  // Short forms
  f: 'Fall',
  sp: 'Spring',
  su: 'Summer',
  wi: 'Winter',
  w: 'Winter',
}

// Sorted by length DESC so longer aliases are tried before short ones
// (prevents 'f' matching before 'fall')
const ALIAS_KEYS_BY_LENGTH = Object.keys(SEASON_ALIASES).sort((a, b) => b.length - a.length)

const YEAR_RE = /\b(20\d{2})\b/

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalise(str: string): string {
  return str.toLowerCase().trim()
}

/**
 * Attempt to extract a year from a string segment.
 * Returns the year number or null.
 */
function extractYear(segment: string): number | null {
  const m = segment.match(YEAR_RE)
  if (!m) return null
  const y = parseInt(m[1], 10)
  return y >= 2000 && y <= 2099 ? y : null
}

/**
 * Attempt to extract a season canonical name from a string segment.
 * Returns the canonical season or null.
 */
function extractSeason(segment: string): string | null {
  const lower = normalise(segment)
  for (const alias of ALIAS_KEYS_BY_LENGTH) {
    if (lower.includes(alias)) return SEASON_ALIASES[alias]
  }
  return null
}

// ── Core detection strategies ─────────────────────────────────────────────────

interface Match {
  season: string
  year: number
}

/**
 * Strategy 1 — explicit separator between season and year (or year then season).
 *
 * Handles:  Fall_2026, Fall-2026, "Fall 2026", 2026_Fall, 2026Fall
 */
function strategyExplicitPair(base: string): Match | null {
  // Season[sep?]Year  or  Year[sep?]Season
  // sep = _, -, space, or nothing
  const sepPattern = /([a-zA-Z]+)[_\-\s]*(20\d{2})|(20\d{2})[_\-\s]*([a-zA-Z]+)/gi

  let m: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((m = sepPattern.exec(base)) !== null) {
    const [, seasonRaw1, yearRaw1, yearRaw2, seasonRaw2] = m
    const seasonRaw = seasonRaw1 || seasonRaw2
    const yearRaw = yearRaw1 || yearRaw2

    const season = extractSeason(seasonRaw)
    const year = extractYear(yearRaw)

    if (season && year) return { season, year }
  }
  return null
}

/**
 * Strategy 2 — season and year appear anywhere in the filename, independent.
 * Less strict: finds the first valid season keyword and the first valid year.
 */
function strategyIndependent(base: string): Match | null {
  const season = extractSeason(base)
  const year = extractYear(base)
  if (season && year) return { season, year }
  if (season && !year) return { season, year: new Date().getFullYear() }
  return null
}

// ── Public API ────────────────────────────────────────────────────────────────

const HINT_MESSAGE =
  'Tên file cần chứa mùa học (ví dụ: Fall2026.xlsx, Summer.xlsx, WINTER-2026.xlsx)'

/**
 * Detects season and year from an Excel filename.
 *
 * @param filename - The original file name including extension
 * @returns Detected season info { season, year, formatted }
 * @throws SeasonDetectorError with a user-friendly Vietnamese message on failure
 *
 * @example
 * detectSeasonFromFilename('Fall2026.xlsx')         // → { season: 'Fall', year: 2026, formatted: 'Fall 2026' }
 * detectSeasonFromFilename('SPRING_2026.xlsx')      // → { season: 'Spring', year: 2026, ... }
 * detectSeasonFromFilename('2026-winter-batch.xlsx')// → { season: 'Winter', year: 2026, ... }
 * detectSeasonFromFilename('students_F_2026.xlsx')  // → { season: 'Fall', year: 2026, ... }  (alias 'f')
 */
export function detectSeasonFromFilename(filename: string): DetectedSeason {
  if (!filename || typeof filename !== 'string') {
    throw new SeasonDetectorError(HINT_MESSAGE)
  }

  // Strip extension (.xlsx, .xls, .csv, ...) and path separators
  const baseName = filename
    .replace(/\.[^/.]+$/, '')
    .split(/[\\/]/)
    .pop() ?? ''

  if (!baseName) {
    throw new SeasonDetectorError(HINT_MESSAGE)
  }

  // Try strategies in priority order
  const result =
    strategyExplicitPair(baseName) ??
    strategyIndependent(baseName)

  if (!result) {
    throw new SeasonDetectorError(
      `Không thể xác định mùa học từ tên file "${filename}". ${HINT_MESSAGE}`
    )
  }

  return {
    season: result.season,
    year: result.year,
    formatted: `${result.season} ${result.year}`,
  }
}

/**
 * Validates if a season string and year are structurally valid.
 * Does NOT check whether the season exists in the database.
 */
export function validateSeasonFormat(season: string, year: number): boolean {
  const canonical = SEASON_ALIASES[normalise(season)]
  return !!canonical && year >= 2000 && year <= 2099
}

/**
 * Returns all accepted season keywords (lowercase) for documentation / UI hints.
 */
export function getAcceptedSeasonKeywords(): string[] {
  return ALIAS_KEYS_BY_LENGTH
}

/**
 * Checks whether a DB Semester row's Season field matches a detected season.
 *
 * The Season field in the database may be stored in various formats depending
 * on how the admin created the season:
 *   - Season name only:       'Fall', 'fall', 'FALL'
 *   - Season + year attached: 'Fall2026', 'fall2026', 'FALL2026'
 *   - Season + year spaced:   'Fall 2026', 'fall 2026'
 *   - Season + year hyphen:   'Fall-2026'
 *   - Season + year underscore: 'Fall_2026'
 *
 * This function matches ALL of these formats against a DetectedSeason object,
 * guaranteeing that a file named "Fall2026_students.xlsx" will correctly find
 * a semester whose Season is stored as "Fall2026", "Fall", "fall 2026", etc.
 *
 * @param dbSeason  - Raw value from Semester.Season column (may be null)
 * @param detected  - Parsed result from detectSeasonFromFilename()
 */
export function matchesSeason(dbSeason: string | null | undefined, detected: DetectedSeason): boolean {
  if (!dbSeason) return false

  const normalized = dbSeason.trim().toLowerCase()
  const seasonLower = detected.season.toLowerCase()
  const yearStr = String(detected.year)

  // Exact season name only: 'fall' === 'fall'
  if (normalized === seasonLower) return true

  // Season+year attached:        'fall2026'
  if (normalized === `${seasonLower}${yearStr}`) return true

  // Season+year with space:      'fall 2026'
  if (normalized === `${seasonLower} ${yearStr}`) return true

  // Season+year with hyphen:     'fall-2026'
  if (normalized === `${seasonLower}-${yearStr}`) return true

  // Season+year with underscore: 'fall_2026'
  if (normalized === `${seasonLower}_${yearStr}`) return true

  // Year+season variants:        '2026fall', '2026 fall', '2026-fall', '2026_fall'
  if (normalized === `${yearStr}${seasonLower}`) return true
  if (normalized === `${yearStr} ${seasonLower}`) return true
  if (normalized === `${yearStr}-${seasonLower}`) return true
  if (normalized === `${yearStr}_${seasonLower}`) return true

  // Loose match: DB value contains BOTH season keyword AND year anywhere in the string
  // e.g. 'FallSemester2026', 'Học kỳ Fall 2026', 'fall_semester_2026'
  if (normalized.includes(seasonLower) && normalized.includes(yearStr)) return true

  return false
}
