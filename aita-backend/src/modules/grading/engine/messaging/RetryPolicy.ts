// @ts-nocheck
export class RetryPolicy {
    public static async withRetryAsync<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delayMs: number = 1000
    ): Promise<T> {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await operation();
            } catch (error) {
                attempt++;
                if (attempt >= maxRetries) throw error;
                console.warn(`[RetryPolicy] Operation failed. Retrying (${attempt}/${maxRetries}) in ${delayMs}ms...`);
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
        throw new Error('Unreachable');
    }
}

