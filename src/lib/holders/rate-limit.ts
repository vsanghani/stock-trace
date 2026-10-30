/** Stay under the SEC fair-access cap of 10 requests per second. */
export const SEC_MAX_REQUESTS_PER_SECOND = 8

export function requestStartTimes(count: number, maxPerSecond: number, origin = 0): number[] {
    if (count < 0) throw new Error("count must be >= 0")
    if (maxPerSecond <= 0) throw new Error("maxPerSecond must be positive")
    const gap = 1000 / maxPerSecond
    return Array.from({ length: count }, (_, index) => origin + index * gap)
}

/** True when any 1 second window contains more than `maxPerSecond` starts. */
export function exceedsFairAccess(times: number[], maxPerSecond = 10, windowMs = 1000): boolean {
    const sorted = [...times].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length; i += 1) {
        let count = 1
        for (let j = i + 1; j < sorted.length; j += 1) {
            if (sorted[j] - sorted[i] >= windowMs) break
            count += 1
            if (count > maxPerSecond) return true
        }
    }
    return false
}

export function createRateLimiter(maxPerSecond = SEC_MAX_REQUESTS_PER_SECOND) {
    const gapMs = 1000 / maxPerSecond
    let nextAt = 0
    let chain: Promise<void> = Promise.resolve()

    return function limit<T>(task: () => Promise<T>): Promise<T> {
        const run = chain.then(async () => {
            const now = Date.now()
            const start = Math.max(now, nextAt)
            nextAt = start + gapMs
            const wait = start - now
            if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
            return task()
        })
        chain = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>
