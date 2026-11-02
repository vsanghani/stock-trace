export interface TtlCache<T> {
    get(key: string): T | undefined
    set(key: string, value: T): void
    clear(): void
}

/** Process-local cache. Entries expire independently and are dropped on read. */
export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now): TtlCache<T> {
    const entries = new Map<string, { value: T; expiresAt: number }>()
    return {
        get(key) {
            const entry = entries.get(key)
            if (!entry) return undefined
            if (entry.expiresAt <= now()) {
                entries.delete(key)
                return undefined
            }
            return entry.value
        },
        set(key, value) {
            entries.set(key, { value, expiresAt: now() + ttlMs })
        },
        clear() {
            entries.clear()
        },
    }
}
