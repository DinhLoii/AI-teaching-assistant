import { AsyncLocalStorage } from 'node:async_hooks'
import { chromium } from 'playwright'

export interface BrowserPresentation { watchBrowser: boolean }
export const browserPresentationContext = new AsyncLocalStorage<BrowserPresentation>()

export function readBrowserPresentation(reportData?: string | null): BrowserPresentation {
  try { return { watchBrowser: JSON.parse(reportData || '{}').__browserPresentation?.watchBrowser !== false } }
  catch { return { watchBrowser: true } }
}

export function reportWithBrowserPresentation(reportData: string | null | undefined, watchBrowser: boolean): string {
  let report: any = {}
  try { const parsed = JSON.parse(reportData || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) report = parsed } catch {}
  return JSON.stringify({ ...report, __browserPresentation: { watchBrowser: watchBrowser === true } })
}

export async function launchGradingBrowser(onMessage?: (message: string) => void) {
  const watchBrowser = browserPresentationContext.getStore()?.watchBrowser !== false
  try {
    const browser = await chromium.launch({ headless: !watchBrowser, slowMo: watchBrowser ? 350 : 0, ...(watchBrowser ? { args: ['--start-maximized'] } : {}) })
    onMessage?.(watchBrowser ? '[Trình duyệt] Đã mở cửa sổ Chromium trên máy để quan sát kiểm thử UI; sẽ tự đóng khi chạy xong.' : '[Trình duyệt] Đang chụp bằng chứng giao diện trong nền.')
    return { browser, visible: watchBrowser }
  } catch (error) {
    if (!watchBrowser) throw error
    onMessage?.('[Trình duyệt] Không mở được cửa sổ trên máy chạy backend; chuyển sang chạy nền và tiếp tục lưu bằng chứng.')
    return { browser: await chromium.launch({ headless: true }), visible: false }
  }
}
