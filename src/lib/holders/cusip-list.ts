import { normalizeIssuerName } from "@/lib/holders/names"

export interface ListedSecurity {
    cusip: string
    hasListedOption: boolean
    issuerName: string
    description: string
    status: "ADDED" | "DELETED" | null
}

export interface SecurityName {
    ticker: string
    name: string
}

export interface CusipLink {
    ticker: string
    cusip: string
}

const EQUITY_DESCRIPTION = /(COM|COMMON|ORD|SHS|STOCK|STK|CL [ABC])/
const NON_EQUITY_DESCRIPTION = /(CALL|PUT|WARRANT|\bRIGHT\b|UNIT|PREFERRED|PFD|DEBT|NOTE|BOND)/

/**
 * Official List of Section 13(f) Securities, fixed-width text.
 * Columns (1-based): CUSIP 1-9, option indicator 10, name 11-40,
 * description 41-67, status 68-70 (*A* added, *D* deleted).
 */
export function parse13fList(text: string): ListedSecurity[] {
    const rows: ListedSecurity[] = []
    for (const raw of text.split(/\r?\n/)) {
        if (raw.length < 9) continue
        const cusip = raw.slice(0, 9).trim().toUpperCase()
        if (!/^[0-9A-Z*@#]{9}$/.test(cusip)) continue

        if (raw.length >= 67) {
            const statusRaw = raw.slice(67, 70).trim().toUpperCase()
            rows.push({
                cusip,
                hasListedOption: raw.slice(9, 10) === "*",
                issuerName: raw.slice(10, 40).trim(),
                description: raw.slice(40, 67).trim(),
                status: statusRaw === "*D*" ? "DELETED" : statusRaw === "*A*" ? "ADDED" : null,
            })
            continue
        }

        const rest = raw.slice(9).trim()
        const starred = rest.startsWith("*")
        rows.push({
            cusip,
            hasListedOption: starred,
            issuerName: (starred ? rest.slice(1) : rest).trim(),
            description: "",
            status: null,
        })
    }
    return rows
}

export function listedCusips(rows: ListedSecurity[]): Set<string> {
    return new Set(rows.filter((row) => row.status !== "DELETED").map((row) => row.cusip))
}

export function isListedCusip(cusip: string, allowed: Set<string>): boolean {
    return allowed.has(cusip.trim().toUpperCase())
}

function isEquityLine(row: ListedSecurity): boolean {
    if (row.status === "DELETED") return false
    const description = row.description.toUpperCase()
    if (NON_EQUITY_DESCRIPTION.test(description)) return false
    if (!description) return true
    return EQUITY_DESCRIPTION.test(description)
}

/**
 * Attach one equity CUSIP to a ticker when the normalised issuer name matches
 * exactly one ticker and exactly one equity line. Dual-class names stay unset
 * so a later 13D/13G filing can record the class CUSIP.
 */
export function linkCusips(securities: SecurityName[], list: ListedSecurity[]): CusipLink[] {
    const tickersByName = new Map<string, string[]>()
    for (const security of securities) {
        const key = normalizeIssuerName(security.name)
        if (!key) continue
        const listForName = tickersByName.get(key) ?? []
        listForName.push(security.ticker.toUpperCase())
        tickersByName.set(key, listForName)
    }

    const cusipsByName = new Map<string, string[]>()
    for (const row of list) {
        if (!isEquityLine(row)) continue
        const key = normalizeIssuerName(row.issuerName)
        if (!key) continue
        const cusips = cusipsByName.get(key) ?? []
        if (!cusips.includes(row.cusip)) cusips.push(row.cusip)
        cusipsByName.set(key, cusips)
    }

    const links: CusipLink[] = []
    for (const [name, tickers] of tickersByName) {
        const uniqueTickers = [...new Set(tickers)]
        const cusips = cusipsByName.get(name) ?? []
        if (uniqueTickers.length !== 1 || cusips.length !== 1) continue
        links.push({ ticker: uniqueTickers[0], cusip: cusips[0] })
    }
    return links.sort((a, b) => a.ticker.localeCompare(b.ticker))
}
