/**
 * Cloudinary Path Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds folder paths and public_ids that Cloudinary will actually accept.
 *
 * Cloudinary rejects a public_id containing any of:  ? & # \ % < > +
 * and treats "/" as the folder separator. Interpolating user-authored text
 * (an exam title, a subject name, an uploaded filename) straight into a path
 * therefore fails the moment someone types an ampersand — e.g.
 *
 *   AITA/DBI202/SE18C02/Assignment 1 (ASS1) - DBI202: Advanced Database
 *   Systems & Programming/student_1785495690328
 *                     ↑ "&" → 400 "public_id ... is invalid"
 *
 * Both helpers below are total: they always return a non-empty, safe string,
 * so an upload can never fail because of how a lecturer titled their exam.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Characters Cloudinary explicitly forbids in a public_id. */
const FORBIDDEN = /[?&#\\%<>+]/g

/** Anything outside this set is replaced — keeps ASCII letters, digits, . _ - */
const UNSAFE = /[^a-zA-Z0-9._-]/g

/** Longest we allow a single path segment to be (Cloudinary caps the whole id at 255). */
const MAX_SEGMENT_LENGTH = 80

/**
 * Turn one arbitrary string into a single safe Cloudinary path segment.
 *
 * Diacritics are folded to ASCII first ("Lập trình" → "Lap trinh") so Vietnamese
 * titles stay readable instead of collapsing into underscores.
 *
 * @param raw      the untrusted text (exam title, subject code, filename, …)
 * @param fallback returned when `raw` sanitizes down to nothing
 */
export function sanitizeCloudinaryPathSegment(raw: unknown, fallback = 'untitled'): string {
  if (raw === null || raw === undefined) return fallback

  const folded = String(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .replace(/[đĐ]/g, (d) => (d === 'đ' ? 'd' : 'D'))

  const safe = folded
    .replace(FORBIDDEN, '_')
    .replace(UNSAFE, '_')
    .replace(/_{2,}/g, '_') // collapse runs of underscores
    .replace(/^[._-]+|[._-]+$/g, '') // no leading/trailing . _ -
    .slice(0, MAX_SEGMENT_LENGTH)
    .replace(/[._-]+$/g, '') // slicing may have left a trailing separator

  return safe.length > 0 ? safe : fallback
}

/**
 * Join segments into a Cloudinary folder path, sanitizing each one.
 * Empty / unusable segments are dropped rather than becoming "untitled".
 *
 *   buildCloudinaryFolder('AITA', 'DBI202', 'A & B')  →  'AITA/DBI202/A_B'
 */
export function buildCloudinaryFolder(...segments: unknown[]): string {
  return segments
    .map((segment) => sanitizeCloudinaryPathSegment(segment, ''))
    .filter((segment) => segment.length > 0)
    .join('/')
}
