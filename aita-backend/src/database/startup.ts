import { setTimeout as delay } from 'node:timers/promises'

/** Allow a suspended database to wake up before starting HTTP and workers. */
export async function waitForDatabase(
  connect: () => Promise<void>,
  warn: (message: string) => void,
  sleep: (ms: number) => Promise<unknown> = delay,
) {
  const attempts = 5
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await connect()
      return
    } catch (error) {
      const code = (error as { code?: string; errorCode?: string })?.code
        || (error as { errorCode?: string })?.errorCode
      if (!code || !['P1001', 'P1002', 'P1017', 'P2024'].includes(code) || attempt === attempts) throw error
      const retryMs = Math.min(attempt * 2000, 10000)
      warn(`Database unavailable (${code}); retrying in ${retryMs / 1000}s (${attempt}/${attempts}).`)
      await sleep(retryMs)
    }
  }
}
