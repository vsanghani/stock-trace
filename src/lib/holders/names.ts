const TRAILING = new Set([
    "INCORPORATED",
    "CORPORATION",
    "COMPANY",
    "HOLDINGS",
    "HLDGS",
    "LIMITED",
    "GROUP",
    "INC",
    "CORP",
    "CO",
    "LTD",
    "PLC",
    "LLC",
    "LP",
    "NV",
    "SA",
    "AG",
])

/** Fold issuer names so "Apple Inc." and "APPLE INC" compare equal. */
export function normalizeIssuerName(name: string): string {
    let text = name.toUpperCase().replace(/&/g, " AND ")
    text = text.replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
    if (text.startsWith("THE ")) text = text.slice(4)
    const parts = text.split(" ").filter(Boolean)
    while (parts.length > 1 && TRAILING.has(parts[parts.length - 1])) {
        parts.pop()
    }
    return parts.join(" ")
}
