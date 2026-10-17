import { AsyncLocalStorage } from 'node:async_hooks'

export const gradingLease = new AsyncLocalStorage<{ owner: string; startedAt?: number; requestVersion?: number; attempt?: number }>()
/** Fence late evaluators after a timeout, cancellation or takeover by another worker. */
export function gradingLeaseScope() {
  const lease = gradingLease.getStore()
  return lease ? { GradingTask: { is: { Status: 'running', LeaseOwner: lease.owner, LeaseUntil: { gt: new Date() } } } } : {}
}
