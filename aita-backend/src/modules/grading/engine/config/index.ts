// @ts-nocheck
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Centralized application configuration.
 * All environment variables are validated and typed here
 * so the rest of the application never reads process.env directly.
 */
export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  paths: {
    uploadDir: path.resolve(process.env.UPLOAD_DIR || 'temp/uploads'),
    extractionDir: path.resolve(process.env.EXTRACTION_DIR || 'temp/extracted'),
  },
  build: {
    timeoutMs: parseInt(process.env.BUILD_TIMEOUT_MS || '30000', 10),
  },
  scoring: {
    maxScore: parseInt(process.env.MAX_SCORE || '100', 10),
  },

  ai: {
    stubMode: process.env.AI_STUB_MODE !== 'false' && process.env.AI_STUB_MODE !== '0',
    geminiKeys: (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k.length > 0),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',

    groqKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    groqBaseUrl: 'https://api.groq.com/openai/v1',

    githubToken: process.env.GITHUB_TOKEN || '',
    githubModel: 'gpt-4o-mini',
    githubBaseUrl: 'https://models.inference.ai.azure.com',

    embeddingModel: 'text-embedding-3-small', // For github if needed
    temperature: 0.7,
    timeoutMs: 30000
  }

} as const;

