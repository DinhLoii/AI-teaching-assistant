import type { RequestHandler } from 'express'
import { sseService } from './sse-service.js'
import { memoryCache } from './memory-cache.js'
import { realtimeBus } from './realtime-bus.js'
realtimeBus.subscribe('cache-invalidated', payload => {
    const prefixes = Array.isArray(payload?.prefixes) ? payload.prefixes : ['']
    for (const prefix of prefixes) if (typeof prefix === 'string') memoryCache.invalidatePrefix(prefix)
})

let timer: ReturnType<typeof setTimeout> | undefined
const pendingPrefixes = new Set<string>()
const gradingPrefixes = ['exams_list_', 'exam_detail_', 'subs_list_', 'subs_recent_', 'sub_detail_', 'student_']
function mutationPrefixes(path: string): string[] {
    const domain = path.split('/')[2]
    if (domain === 'users' || domain === 'auth') return [...gradingPrefixes, 'user_', 'classes_', 'class_', 'subjects_', 'subject_', 'options_']
    if (domain === 'classes') return [...gradingPrefixes, 'classes_', 'class_', 'options_']
    if (domain === 'subjects') return [...gradingPrefixes, 'subjects_', 'subject_', 'classes_', 'class_', 'options_']
    if (domain === 'semesters') return [...gradingPrefixes, 'semesters_', 'subjects_', 'subject_', 'classes_', 'class_', 'options_']
    return [...gradingPrefixes, 'classes_', 'class_', 'options_assignments_']
}
/** Send invalidation only (never user/grade data). Clients fetch an authorized snapshot. */
export function invalidateAnalytics(prefixes: string[] = gradingPrefixes) {
    for (const prefix of [...prefixes, 'stats_', 'reports_']) {
        memoryCache.invalidatePrefix(prefix)
        pendingPrefixes.add(prefix)
    }
    if (timer) return
    timer = setTimeout(() => {
        timer = undefined
        realtimeBus.publish('cache-invalidated', { prefixes: [...pendingPrefixes] })
        pendingPrefixes.clear()
        sseService.broadcastToRole('admin', { type: 'ANALYTICS_INVALIDATED' })
    }, 150)
    timer.unref?.()
}

export const analyticsMutationEvents: RequestHandler = (req, res, next) => {
    const relevant = !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && /^\/api\/(users|classes|subjects|semesters|assignments|submissions|grading|exams|appeals|auth\/register)(\/|$)/.test(req.path)
    if (relevant) res.once('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) invalidateAnalytics(mutationPrefixes(req.path))
    })
    next()
}
