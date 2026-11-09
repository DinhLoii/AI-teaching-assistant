// @ts-nocheck
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js'; // Adjust if needed
import { prisma } from '../../../../../database/prisma.js';
import { StubAiGenerator } from './StubAiGenerator.js';
import { AppError } from '../../../../../shared/application/app.error.js';

export class AiCache {
    private static cache: Record<string, any> = {};

    public static clearCache(): void {
        this.cache = {};
    }

    public static get(key: string): any {
        return this.cache[key];
    }

    public static set(key: string, value: any) {
        this.cache[key] = value;
    }
}

class Semaphore {
    private permits: number;
    private queue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }
        return new Promise<void>(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.permits++;
        }
    }
}

const globalAiSemaphore = new Semaphore(3);

export class AiClientManager {
    public static lastFailureDiagnostic: { kind: string; status: number; name: string } | null = null;
    private static currentKeyIndex = 0;
    private static rateLimitExpiry = new Map<string, number>();
    private static keyFailures = new Map<string, any>();

    public static cooldownMs(error: any, attempt: number): number {
        const raw = error?.headers?.get?.('retry-after') ?? error?.headers?.['retry-after'];
        const seconds = Number(raw);
        const providerDelay = raw == null ? 0 : Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(raw) - Date.now());
        return Math.max(Math.min(30000, 5000 * 2 ** (attempt - 1)), Number.isFinite(providerDelay) ? providerDelay : 0);
    }

    public static async executeStub<T>(
        apiCall: (client: any, model: string) => Promise<T>,
        cacheKey?: string
    ): Promise<T> {
        const stubClient: any = {
            chat: {
                completions: {
                    create: async (params: any) => {
                        const systemMsg = params.messages?.find((m: any) => m.role === 'system')?.content || '';
                        const userMsgs = params.messages?.filter((m: any) => m.role !== 'system') || [];
                        const userPrompt = userMsgs.map((m: any) => {
                            if (typeof m.content === 'string') return m.content;
                            if (Array.isArray(m.content)) {
                                return m.content.map((p: any) => p.text || '').join('\n');
                            }
                            return JSON.stringify(m.content);
                        }).join('\n');

                        const content = StubAiGenerator.generate(systemMsg, userPrompt, params.response_format);
                        return {
                            choices: [
                                {
                                    message: {
                                        content: content
                                    }
                                }
                            ]
                        };
                    }
                }
            }
        };

        const result = await apiCall(stubClient, 'ai-stub-model');
        if (cacheKey) AiCache.set(cacheKey, result);
        return result;
    }

    public static async executeWithFallback<T>(
        apiCall: (client: OpenAI, model: string) => Promise<T>,
        cacheKey?: string
    ): Promise<T> {
        if (cacheKey) {
            const cachedValue = AiCache.get(cacheKey);
            if (cachedValue !== undefined) {
                console.log("[AiClientManager] Cache HIT for key: " + cacheKey.substring(0, 16));
                return cachedValue as T;
            }
        }

        const hasConfiguredKeys = (config.ai.geminiKeys && config.ai.geminiKeys.length > 0) || Boolean(config.ai.githubToken) || Boolean((config.ai as any).groqKey || process.env.GROQ_API_KEY);
        const isStubMode = (config.ai as any)?.stubMode ?? (process.env.AI_STUB_MODE === 'true' || process.env.AI_STUB_MODE === '1');

        if (isStubMode) {
            console.log(`[AiClientManager] Executing in AI Stub Mode (isStubMode: ${isStubMode}, hasConfiguredKeys: ${hasConfiguredKeys})`);
            return await AiClientManager.executeStub(apiCall, cacheKey);
        }
        if (!hasConfiguredKeys) {
            throw new AppError('AI_NOT_CONFIGURED', 'Chưa cấu hình dịch vụ AI. Không tạo kết quả giả lập thay cho kết quả chấm bài.', 503);
        }

        let lastError: any;
        const maxGlobalAttempts = 3;

        for (let globalAttempt = 1; globalAttempt <= maxGlobalAttempts; globalAttempt++) {
            // 0. Try Groq (LPU Ultra-fast inference with 120B / 20B / Qwen parameter models)
            const groqKey = (config.ai as any).groqKey || process.env.GROQ_API_KEY;
            if (groqKey) {
                const primaryGroqModel = (config.ai as any).groqModel || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
                const candidateGroqModels = [primaryGroqModel, 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter((v, i, a) => a.indexOf(v) === i);
                const groqBaseUrl = (config.ai as any).groqBaseUrl || 'https://api.groq.com/openai/v1';

                for (const groqModel of candidateGroqModels) {
                    console.log(`[AiClientManager] Attempting Groq Cloud AI (${groqModel})...`);
                    try {
                        const rawGroqClient = new OpenAI({
                            apiKey: groqKey,
                            baseURL: groqBaseUrl,
                            timeout: config.ai.timeoutMs || 30000,
                            maxRetries: 1,
                        });

                        const groqClient = {
                            chat: {
                                completions: {
                                    create: async (params: any, options?: any) => {
                                        const sanitizedParams = { ...params, model: groqModel };
                                        if (Array.isArray(sanitizedParams.messages)) {
                                            sanitizedParams.messages = sanitizedParams.messages.map((msg: any) => {
                                                if (Array.isArray(msg.content)) {
                                                    const textParts = msg.content
                                                        .map((p: any) => (p.type === 'text' ? p.text : ''))
                                                        .filter(Boolean)
                                                        .join('\n');
                                                    return { ...msg, content: textParts || '[Image diagram omitted for text model]' };
                                                }
                                                return msg;
                                            });
                                        }
                                        return await rawGroqClient.chat.completions.create(sanitizedParams, options);
                                    }
                                }
                            }
                        };

                        await globalAiSemaphore.acquire();
                        try {
                            const startTime = Date.now();
                            const result = await apiCall(groqClient as any, groqModel);
                            const duration = Date.now() - startTime;
                            console.log(`[AiClientManager] Groq succeeded in ${duration}ms using model: ${groqModel}`);

                            try {
                                await prisma.aiUsageLog.create({
                                    data: {
                                        Provider: 'Groq',
                                        ModelUsed: groqModel,
                                        IsSuccess: true,
                                        DurationMs: duration
                                    }
                                });
                            } catch (e) { }

                            if (cacheKey) AiCache.set(cacheKey, result);
                            return result;
                        } finally {
                            globalAiSemaphore.release();
                        }
                    } catch (groqErr: any) {
                        console.error(`[AiClientManager] Groq attempt with ${groqModel} failed:`, groqErr?.message || groqErr);
                        lastError = groqErr;
                        if (groqErr?.status === 401 || (groqErr?.message && /invalid_api_key|expired_api_key|api_key_invalid|invalid api key|unauthorized/i.test(groqErr.message))) {
                            console.warn('[AiClientManager] Groq API Key is invalid or expired. Aborting candidate model loop.');
                            break;
                        }
                    }
                }
            }
            // 1. Try Gemini keys first
            if (config.ai.geminiKeys && config.ai.geminiKeys.length > 0) {
                const displayModel = config.ai.geminiModel || 'gemini-3.5-flash-lite';
                const model = displayModel;
                const totalKeys = config.ai.geminiKeys.length;

                // Round-robin starting index
                const startIndex = AiClientManager.currentKeyIndex;
                AiClientManager.currentKeyIndex = (AiClientManager.currentKeyIndex + 1) % totalKeys;

                let minWaitTime = Infinity;
                let triedAnyKey = false;

                for (let i = 0; i < totalKeys; i++) {
                    const keyIndex = (startIndex + i) % totalKeys;
                    const key = config.ai.geminiKeys[keyIndex];

                    const expiry = AiClientManager.rateLimitExpiry.get(key) || 0;
                    const now = Date.now();

                    if (expiry > now) {
                        const wait = expiry - now;
                        if (wait < minWaitTime) minWaitTime = wait;
                        lastError = AiClientManager.keyFailures.get(key) || Object.assign(new Error("AI provider cooldown"), { status: 503 });
                        continue; // Respect cooldown across concurrent requests.
                    }

                    triedAnyKey = true;

                    let client: any;
                    if (key.startsWith('AQ')) {
                        client = {
                            chat: {
                                completions: {
                                    create: async (params: any, options?: any) => {
                                        const systemMsg = params.messages?.find((m: any) => m.role === 'system')?.content || '';
                                        const userMsgs = params.messages?.filter((m: any) => m.role !== 'system') || [];

                                        let parts: any[] = [];
                                        if (systemMsg) {
                                            parts.push({ text: `[System Instruction]\n${systemMsg}\n\n` });
                                        }

                                        for (const msg of userMsgs) {
                                            if (typeof msg.content === 'string') {
                                                parts.push({ text: msg.content });
                                            } else if (Array.isArray(msg.content)) {
                                                for (const p of msg.content) {
                                                    if (p.type === 'text') {
                                                        parts.push({ text: p.text });
                                                    } else if (p.type === 'image_url') {
                                                        const url = p.image_url?.url || '';
                                                        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
                                                        if (match) {
                                                            parts.push({
                                                                inlineData: {
                                                                    mimeType: match[1],
                                                                    data: match[2]
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        const targetModel = model || config.ai.geminiModel || 'gemini-3.5-flash-lite';
                                        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;

                                        const generationConfig: any = {};
                                        if (params.temperature !== undefined) {
                                            generationConfig.temperature = params.temperature;
                                        }
                                        if (params.response_format?.type === 'json_object') {
                                            generationConfig.responseMimeType = 'application/json';
                                        }

                                        const bodyPayload: any = {
                                            contents: [{ parts }]
                                        };
                                        if (Object.keys(generationConfig).length > 0) {
                                            bodyPayload.generationConfig = generationConfig;
                                        }

                                        const res = await fetch(endpoint, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'x-goog-api-key': key
                                            },
                                            body: JSON.stringify(bodyPayload),
                                            signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(config.ai.timeoutMs)]) : AbortSignal.timeout(config.ai.timeoutMs)
                                        });

                                        if (!res.ok) {
                                            const errText = await res.text();
                                            const err: any = new Error(errText);
                                            err.status = res.status;
                                            throw err;
                                        }

                                        const data: any = await res.json();
                                        const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
                                        return { choices: [{ message: { content: text } }] };
                                    }
                                }
                            }
                        };
                    } else {
                        const genAI = new GoogleGenerativeAI(key);
                        client = {
                            chat: {
                                completions: {
                                    create: async (params: any, options?: any) => {
                                        const systemMsg = params.messages?.find((m: any) => m.role === 'system')?.content || '';
                                        const userMsgs = params.messages?.filter((m: any) => m.role !== 'system') || [];

                                        let contents: any[] = [];
                                        for (const msg of userMsgs) {
                                            if (typeof msg.content === 'string') {
                                                contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
                                            } else if (Array.isArray(msg.content)) {
                                                const parts: any[] = [];
                                                for (const part of msg.content) {
                                                    if (part.type === 'text') {
                                                        parts.push({ text: part.text });
                                                    } else if (part.type === 'image_url') {
                                                        const url = part.image_url?.url || '';
                                                        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
                                                        if (match) {
                                                            parts.push({
                                                                inlineData: {
                                                                    mimeType: match[1],
                                                                    data: match[2]
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                                contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
                                            }
                                        }

                                        const genModel = genAI.getGenerativeModel({
                                            model: model,
                                            systemInstruction: systemMsg ? systemMsg : undefined
                                        });

                                        const genConfig: any = {
                                            temperature: params.temperature ?? 0.7
                                        };
                                        if (params.response_format?.type === 'json_object') {
                                            genConfig.responseMimeType = 'application/json';
                                        }

                                        const genResult = await genModel.generateContent({
                                            contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
                                            generationConfig: genConfig
                                        }, { timeout: config.ai.timeoutMs, signal: options?.signal });
                                        const text = genResult.response.text();
                                        return { choices: [{ message: { content: text } }] };
                                    }
                                }
                            }
                        };
                    }

                    try {
                        await globalAiSemaphore.acquire();
                        try {
                            const startTime = Date.now();
                            const result = await apiCall(client, model);
                            const duration = Date.now() - startTime;

                            // Non-blocking usage logging to DB
                            prisma.aiUsageLog.create({
                                data: {
                                    Provider: 'Gemini',
                                    ModelUsed: model,
                                    IsSuccess: true,
                                    DurationMs: duration
                                }
                            }).catch(() => {});

                            if (cacheKey) AiCache.set(cacheKey, result);
                            return result;
                        } finally {
                            globalAiSemaphore.release();
                        }
                    } catch (err: any) {
                        lastError = err;
                        AiClientManager.keyFailures.set(key, err);

                        // A response-format/evidence failure is not an API key outage.
                        // Let the next attempt request valid JSON without cooling down the key.
                        if (err instanceof SyntaxError || /AI_JSON_INVALID|AI_CODE_EVIDENCE_MISSING|AI_REVIEW_INVALID/.test(err.message || '')) {
                            console.warn(`[AiClientManager] Key #${keyIndex + 1}: phản hồi không hợp lệ; sẽ yêu cầu lại, không khóa API key.`);
                            continue;
                        }

                        const status = Number(err.status || err.statusCode || 0);
                        const errBody = err.error ? JSON.stringify(err.error) : (err.message || String(err));

                        if (status === 429 || (err.message && err.message.includes('429'))) {
                            console.warn(`[AiClientManager] Key #${keyIndex + 1} rate limited (429). Waiting before retry...`);
                            const newExpiry = Date.now() + AiClientManager.cooldownMs(err, globalAttempt);
                            AiClientManager.rateLimitExpiry.set(key, newExpiry);

                            const wait = newExpiry - Date.now();
                            if (wait < minWaitTime) minWaitTime = wait;
                            continue;
                        } else {
                            console.error(`[AiClientManager] Key #${keyIndex + 1} failed (HTTP ${status}): ${errBody}`);
                            prisma.aiUsageLog.create({
                                data: {
                                    Provider: 'Gemini',
                                    ModelUsed: model,
                                    IsSuccess: false,
                                    ErrorMessage: `HTTP ${status}: ${err.message || String(err)}`
                                }
                            }).catch(() => {});

                            // Preserve provider Retry-After and use bounded exponential backoff.
                            AiClientManager.rateLimitExpiry.set(key, Date.now() + AiClientManager.cooldownMs(err, globalAttempt));
                            continue;
                        }
                    }
                } // End of key loop

                if (!triedAnyKey) {
                    console.warn(`[AiClientManager] All keys are cooling down; preserving provider backoff.`);
                }
            }

            // 2. Fallback to GitHub Models (GPT-4o-mini) if configured or if Gemini fails
            if (config.ai.githubToken) {
                console.log(`[AiClientManager] Attempting fallback to GitHub Models (${config.ai.githubModel})...`);
                try {
                    const ghClient = new OpenAI({
                        apiKey: config.ai.githubToken,
                        baseURL: config.ai.githubBaseUrl,
                        timeout: config.ai.timeoutMs,
                        maxRetries: 0
                    });

                    await globalAiSemaphore.acquire();
                    try {
                        const startTime = Date.now();
                        const result = await apiCall(ghClient, config.ai.githubModel);
                        const duration = Date.now() - startTime;

                        try {
                            await prisma.aiUsageLog.create({
                                data: {
                                    Provider: 'GitHubModels',
                                    ModelUsed: config.ai.githubModel,
                                    IsSuccess: true,
                                    DurationMs: duration
                                }
                            });
                        } catch (e) { }

                        if (cacheKey) AiCache.set(cacheKey, result);
                        return result;
                    } finally {
                        globalAiSemaphore.release();
                    }
                } catch (ghErr: any) {
                    console.error('[AiClientManager] GitHub Models fallback failed:', ghErr?.message || ghErr);
                    lastError = ghErr;
                }
            }

            const isTimeoutOrRateLimit = lastError && ([429, 500, 502, 503, 504].includes(Number(lastError.status || lastError.statusCode)) || lastError.message?.includes('429') || /AI_TIMEOUT|timed? out|timeout|abort|fetch failed|ECONN/i.test(lastError.message || ''));
            if (globalAttempt < maxGlobalAttempts && isTimeoutOrRateLimit) {
                const activeExpiries = [...AiClientManager.rateLimitExpiry.values()].filter(expiry => expiry > Date.now());
                const waitMs = Math.min(30000, Math.max(5000 * 2 ** (globalAttempt - 1), activeExpiries.length ? Math.min(...activeExpiries) - Date.now() : 0));
                console.warn('[AiClientManager] Providers unavailable; retry ' + globalAttempt + '/' + maxGlobalAttempts + ' after ' + Math.ceil(waitMs / 1000) + 's.');
                await new Promise(resolve => setTimeout(resolve, waitMs));
            } else {
                break;
            }
        }

        const errMsg = lastError?.message || String(lastError || 'All AI providers failed');
        const failureKind = /timed? out|timeout|abort/i.test(errMsg) ? 'TIMEOUT'
            : /MAX_TOKENS|token limit/i.test(errMsg) ? 'TOKEN_LIMIT'
            : /SAFETY|RECITATION|PROHIBITED_CONTENT|BLOCKLIST/i.test(errMsg) ? 'CONTENT_BLOCKED'
            : /fetch failed|ECONN|network/i.test(errMsg) ? 'NETWORK'
            : 'PROVIDER_RESPONSE';
        AiClientManager.lastFailureDiagnostic = { kind: failureKind, status: Number(lastError?.status || lastError?.statusCode || 0), name: String(lastError?.name || 'Error') };
        if (errMsg.includes('429') || lastError?.status === 429) {
            throw new AppError(
                'AI_RATE_LIMIT',
                'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Hệ thống sẽ thử lại theo thời gian chờ của dịch vụ.',
                503
            );
        }

        const isAuthOrExpired =
            lastError?.status === 401 ||
            lastError?.statusCode === 401 ||
            /invalid_api_key|expired_api_key|api_key_invalid|invalid api key|incorrect api key|api key has expired|key expired|unauthorized|authentication_error|insufficient_quota|credit_expired|account_deactivated/i.test(errMsg);

        if (isAuthOrExpired) {
            console.error(`[AiClientManager] AI API Key expired or invalid: ${errMsg}`);
            throw new AppError(
                'AI_API_KEY_EXPIRED',
                'Khóa API (API Key) của hệ thống AI đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra và cập nhật lại API Key mới trong file cấu hình .env (GROQ_API_KEY).',
                401
            );
        }

        // Preserve response-validation errors for the evaluator's bounded repair loop.
        // They are not provider outages and must never enter the success cache.
        if (lastError instanceof SyntaxError || /^AI_(CODE_EVIDENCE_MISSING|REVIEW_INVALID):/.test(errMsg)) throw lastError;
        if (failureKind === 'TIMEOUT' || failureKind === 'NETWORK') throw new AppError('AI_TIMEOUT', 'AI_TIMEOUT: Dịch vụ AI chưa hoàn tất trong thời gian cho phép.', 504);
        throw new AppError('AI_UNAVAILABLE', 'Dịch vụ AI chưa trả được kết quả. Vui lòng thử chấm lại; hệ thống không thay bằng kết quả giả lập.', 503);
    }
}

