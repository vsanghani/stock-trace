import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { readStoredValue } from "@/lib/storage"

const KEY = "plutox-pnl-data"
const LEGACY_KEY = "stock-trace-pnl-data"

/** Minimal stand-in for the Web Storage API; the test env is plain node. */
function createLocalStorage(seed: Record<string, string> = {}) {
    const store = new Map(Object.entries(seed))
    return {
        store,
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value)
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key)
        }),
    }
}

let storage: ReturnType<typeof createLocalStorage>

function install(seed: Record<string, string> = {}) {
    storage = createLocalStorage(seed)
    vi.stubGlobal("localStorage", storage)
    return storage
}

beforeEach(() => {
    install()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("readStoredValue", () => {
    it("returns the value stored under the current key", () => {
        install({ [KEY]: '["current"]' })
        expect(readStoredValue(KEY)).toBe('["current"]')
    })

    it("returns null when neither key is set", () => {
        expect(readStoredValue(KEY)).toBeNull()
    })

    it("promotes a legacy value to the current key", () => {
        install({ [LEGACY_KEY]: '["legacy"]' })

        expect(readStoredValue(KEY)).toBe('["legacy"]')
        expect(storage.store.get(KEY)).toBe('["legacy"]')
    })

    it("clears the legacy key once promoted", () => {
        install({ [LEGACY_KEY]: '["legacy"]' })
        readStoredValue(KEY)

        expect(storage.store.has(LEGACY_KEY)).toBe(false)
    })

    it("does not run twice, since the second read finds the current key", () => {
        install({ [LEGACY_KEY]: '["legacy"]' })
        readStoredValue(KEY)
        storage.setItem.mockClear()

        expect(readStoredValue(KEY)).toBe('["legacy"]')
        expect(storage.setItem).not.toHaveBeenCalled()
    })

    it("prefers the current key over a stale legacy value", () => {
        install({ [KEY]: '["current"]', [LEGACY_KEY]: '["legacy"]' })

        expect(readStoredValue(KEY)).toBe('["current"]')
        expect(storage.store.get(LEGACY_KEY)).toBe('["legacy"]')
    })

    it("ignores keys outside the product namespace", () => {
        install({ "theme": "dark" })

        expect(readStoredValue("theme")).toBe("dark")
        expect(readStoredValue("other-key")).toBeNull()
    })

    it("keeps the legacy value when the promoting write fails", () => {
        install({ [LEGACY_KEY]: '["legacy"]' })
        storage.setItem.mockImplementation(() => {
            throw new Error("QuotaExceededError")
        })

        expect(readStoredValue(KEY)).toBe('["legacy"]')
        expect(storage.store.get(LEGACY_KEY)).toBe('["legacy"]')
    })
})
