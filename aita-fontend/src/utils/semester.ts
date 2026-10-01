/**
 * Formats a semester code for display.
 * E.g. "SP2025" -> "Spring 2025", "FA2025" -> "Fall 2025", "SU2025" -> "Summer 2025"
 */
export function formatSemesterCode(code: string): string {
  if (!code) return code
  const prefixMap: Record<string, string> = {
    SP: 'Spring', FA: 'Fall', SU: 'Summer', WI: 'Winter'
  }
  const prefix = code.slice(0, 2).toUpperCase()
  const rest = code.slice(2)
  return prefixMap[prefix] ? `${prefixMap[prefix]} ${rest}` : code
}