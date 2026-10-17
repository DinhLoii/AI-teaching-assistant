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
    .transform((v) => v === 'true' || v === '1'),
  AI_ENDPOINT: z.string().default('http://localhost:8000'),
  GEMINI_API_KEYS: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
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
}).superRefine((value, context) => {
  if (!value.DATABASE_URL.startsWith('postgresql://') && !value.DATABASE_URL.startsWith('postgres://')) context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Ứng dụng yêu cầu PostgreSQL.' })
  if (value.NODE_ENV !== 'production') return
  if (value.JWT_SECRET.length < 32 || /aita_super_secret|development|change.?me|your.?secret|replace_with/i.test(value.JWT_SECRET)) context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Production yêu cầu khóa JWT ngẫu nhiên tối thiểu 32 ký tự.' })
  if (value.AI_STUB_MODE) context.addIssue({ code: 'custom', path: ['AI_STUB_MODE'], message: 'Không cho phép chấm điểm giả lập trên production.' })
})

export const env = schema.parse(process.env)

