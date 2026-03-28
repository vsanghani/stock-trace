function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
}

export interface RetryOptions {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
}

const defaultOpts: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 4000,
}

/**
 * Exponential backoff with jitter. Retries only when `shouldRetry(err)` is true.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions & { shouldRetry?: (err: unknown) => boolean } = {}
): Promise<T> {
    const { maxAttempts, baseDelayMs, maxDelayMs } = { ...defaultOpts, ...options }
    const shouldRetry = options.shouldRetry ?? (() => true)
    let lastErr: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastErr = err
            if (attempt === maxAttempts - 1 || !shouldRetry(err)) break
            const exp = baseDelayMs * Math.pow(2, attempt)
            const jitter = Math.random() * 300
            const delay = Math.min(exp + jitter, maxDelayMs)
            await sleep(delay)
        }
    }
    throw lastErr
}
