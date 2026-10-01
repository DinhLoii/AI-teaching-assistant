import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  AI_STUB_MODE: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  AI_ENDPOINT: z.string().default('http://localhost:8000'),
  GEMINI_API_KEYS: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GITHUB_TOKEN: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('temp/uploads'),
  EXTRACTION_DIR: z.string().default('temp/extracted'),
  BUILD_TIMEOUT_MS: z.coerce.number().default(30000),
  MAX_SCORE: z.coerce.number().default(100),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  DB_TRANSACTION_TIMEOUT: z.coerce.number().default(10000),
})

export const env = schema.parse(process.env)

