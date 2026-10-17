import type { RequestHandler } from 'express'
import { sseService } from './sse-service.js'
import { memoryCache } from './memory-cache.js'
import { realtimeBus } from './realtime-bus.js'
realtimeBus.subscribe('cache-invalidated', () => memoryCache.invalidatePrefix(''))

let timer: ReturnType<typeof setTimeout> | undefined
/** Send invalidation only (never user/grade data). Clients fetch an authorized snapshot. */
export function invalidateAnalytics() {
    memoryCache.invalidatePrefix('stats_')
    memoryCache.invalidatePrefix('reports_')
    if (timer) return
    timer = setTimeout(() => {
        timer = undefined
        realtimeBus.publish('cache-invalidated', {})
        sseService.broadcastToRole('admin', { type: 'ANALYTICS_INVALIDATED' })
    }, 150)
    timer.unref?.()
}

export const analyticsMutationEvents: RequestHandler = (req, res, next) => {
    const relevant = !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && /^\/api\/(users|classes|subjects|semesters|assignments|submissions|grading|exams|appeals|auth\/register)(\/|$)/.test(req.path)
    if (relevant) res.once('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) invalidateAnalytics()
    })
    next()
}
