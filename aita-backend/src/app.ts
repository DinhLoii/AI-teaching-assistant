import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { routeManager } from './shared/presentation/route-manager.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/request-logger.js'
import { ApiResponse } from './shared/presentation/api-response.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  // Accept both :5173 and :5174 for frontend dev.
  // :8081 = Expo/Metro web (mobile app reviewed in the browser).
  const devOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:8081']
  // Anything deployed lives on some other origin, so CORS_ORIGIN carries it:
  // either '*' or a comma-separated list.
  const configuredOrigins = env.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const allowEveryOrigin = configuredOrigins.includes('*')
  const allowedOrigins = new Set([...devOrigins, ...configuredOrigins])
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // No Origin header at all means a same-origin GET, curl or another server.
      if (!origin || allowEveryOrigin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      // Answer without the CORS headers and let the browser refuse the response.
      // Passing an Error here instead turned every request from an unlisted
      // origin into a 500 — and browsers send Origin on every POST, same-origin
      // included, so a deployed site could not log in at all.
      callback(null, false)
    },
    credentials: true
  }
  app.use(cors(corsOptions))
  app.use(requestLogger)
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use(express.json({ limit: '100mb' }))
  app.use(express.urlencoded({ limit: '100mb', extended: true }))
  // Uploaded avatars/attachments are fetched by the web client (:5173) and the Expo web build
  // (:8081), i.e. from a different origin than this API. helmet() defaults
  // Cross-Origin-Resource-Policy to same-origin, which made the browser download the image and
  // then refuse to render it (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) — the upload looked like
  // it silently failed. These are public static files, so opt this path out.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      next()
    },
    express.static(path.join(process.cwd(), 'uploads')),
  )

  app.use('/api', routeManager.getRouter())

  app.use((_req, res) => {
    res.status(404).json(ApiResponse.error('API không tồn tại', 404))
  })

  app.use(errorHandler)
  return app
}

