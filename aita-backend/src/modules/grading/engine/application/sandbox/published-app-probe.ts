/** Test the host URL that Chromium will use, never an internal-only Docker IP. */
export async function probePublishedApp(url: string, requireHtml: boolean, timeoutMs = 1500, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (requireHtml) {
      if (!response.ok) { await response.body?.cancel(); return false }
      const body = await response.text()
      return /<(?:!doctype\s+html|html|body)\b/i.test(body)
    }
    const ready = response.ok || response.status === 404
    await response.body?.cancel()
    return ready
  } catch { return false }
}
