/**
 * Simple in-memory TTL cache for a single Node process.
 * In serverless, entries do not share across instances; still reduces bursts per instance.
 */

type Entry<T> = { value: T; expiresAt: number }

const store = new Map<string, Entry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
    const e = store.get(key) as Entry<T> | undefined
    if (!e) return undefined
    if (Date.now() >= e.expiresAt) {
        store.delete(key)
        return undefined
    }
    return e.value
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/** Bound cache size (best-effort) */
const MAX_KEYS = 500

export function cachePruneIfNeeded(): void {
    if (store.size <= MAX_KEYS) return
    const now = Date.now()
    for (const [k, e] of store) {
        if (now >= e.expiresAt) store.delete(k)
        if (store.size <= MAX_KEYS * 0.8) break
    }
    if (store.size > MAX_KEYS) {
        const keys = [...store.keys()].slice(0, store.size - MAX_KEYS)
        keys.forEach((k) => store.delete(k))
    }
}
