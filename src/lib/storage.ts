/**
 * Browser storage keys for the tools that persist state locally.
 *
 * Keys were prefixed `stock-trace-` before the product was renamed to Plutox.
 * Reads fall back to that prefix once and promote the value to the current key,
 * so holdings, trades, and alerts saved under the old name survive the rename.
 */

const PREFIX = "plutox-"
const LEGACY_PREFIX = "stock-trace-"

/**
 * Raw value for `key`, promoting anything still stored under the pre-rename
 * prefix. Returns `null` when neither the current nor the legacy key is set.
 *
 * Call only from the browser; `key` is expected to start with `plutox-`.
 */
export function readStoredValue(key: string): string | null {
    const current = localStorage.getItem(key)
    if (current !== null) return current

    if (!key.startsWith(PREFIX)) return null

    const legacyKey = `${LEGACY_PREFIX}${key.slice(PREFIX.length)}`
    const legacy = localStorage.getItem(legacyKey)
    if (legacy === null) return null

    try {
        localStorage.setItem(key, legacy)
        localStorage.removeItem(legacyKey)
    } catch {
        // Quota or private-mode failures must not lose the value, so the legacy
        // copy is left in place and returned for this session.
    }

    return legacy
}
