/** Allocate in hundredths: all criteria differ by at most 0.01, total is exact. */
export function distributeRubricPoints<T extends { maxPoints: number }>(criteria: T[], target: number): T[] {
  if (!criteria.length || !Number.isFinite(target) || target <= 0) return criteria
  const units = Math.round(target * 100)
  const base = Math.floor(units / criteria.length)
  const remainder = units % criteria.length
  return criteria.map((criterion, index) => ({ ...criterion, maxPoints: (base + (index < remainder ? 1 : 0)) / 100 }))
}
