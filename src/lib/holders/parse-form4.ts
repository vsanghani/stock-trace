import { padCik, parseEdgarDate } from "@/lib/holders/dates"
import { asArray, child, fieldText, parseXml } from "@/lib/holders/xml"

export interface InsiderRow {
    order: number
    securityTitle: string
    transactionDate: string | null
    transactionCode: string | null
    acquiredDisposed: string | null
    shares: number | null
    pricePerShare: number | null
    sharesFollowing: number | null
    directOrIndirect: string | null
    kind: "transaction" | "holding"
}

export interface Form4Owner {
    cik: string
    name: string
    isOfficer: boolean
    isDirector: boolean
    isTenPercent: boolean
    officerTitle: string | null
}

export interface Form4Filing {
    formType: string
    filedAt: string | null
    periodOfReport: string | null
    issuerCik: string
    issuerName: string
    ticker: string
    owners: Form4Owner[]
    rows: InsiderRow[]
}

const COMMON_STOCK = /(common stock|common shares|ordinary shares|ordinary share)/i

export function isCommonStockTitle(title: string): boolean {
    return COMMON_STOCK.test(title)
}

function parseDecimal(value: string | null): number | null {
    if (!value) return null
    const parsed = Number(value.replace(/,/g, ""))
    return Number.isFinite(parsed) ? parsed : null
}

function flag(node: unknown): boolean {
    const text = fieldText(node)?.toLowerCase()
    return text === "1" || text === "true" || text === "y" || text === "yes"
}

function readRow(node: unknown, order: number, kind: InsiderRow["kind"]): InsiderRow | null {
    const title = fieldText(child(node, "securityTitle"))
    if (!title) return null
    return {
        order,
        securityTitle: title,
        transactionDate: parseEdgarDate(fieldText(child(node, "transactionDate"))),
        transactionCode: fieldText(child(node, "transactionCoding", "transactionCode")),
        acquiredDisposed: fieldText(child(node, "transactionAmounts", "transactionAcquiredDisposedCode")),
        shares: parseDecimal(fieldText(child(node, "transactionAmounts", "transactionShares"))),
        pricePerShare: parseDecimal(fieldText(child(node, "transactionAmounts", "transactionPricePerShare"))),
        sharesFollowing: parseDecimal(fieldText(child(node, "postTransactionAmounts", "sharesOwnedFollowingTransaction"))),
        directOrIndirect: fieldText(child(node, "ownershipNature", "directOrIndirectOwnership"))?.toUpperCase() ?? null,
        kind,
    }
}

export function parseForm4Xml(xml: string): Form4Filing | null {
    const root = child(parseXml(xml), "ownershipDocument")
    if (!root) return null
    const documentType = fieldText(child(root, "documentType")) ?? "4"
    if (documentType !== "4" && documentType !== "4/A") return null

    const issuerCik = fieldText(child(root, "issuer", "issuerCik"))
    const ticker = fieldText(child(root, "issuer", "issuerTradingSymbol"))
    if (!issuerCik || !ticker) return null

    const owners: Form4Owner[] = []
    for (const owner of asArray(child(root, "reportingOwner"))) {
        const cik = fieldText(child(owner, "reportingOwnerId", "rptOwnerCik"))
        const name = fieldText(child(owner, "reportingOwnerId", "rptOwnerName"))
        if (!cik || !name) continue
        const relationship = child(owner, "reportingOwnerRelationship")
        owners.push({
            cik: padCik(cik),
            name,
            isOfficer: flag(child(relationship, "isOfficer")),
            isDirector: flag(child(relationship, "isDirector")),
            isTenPercent: flag(child(relationship, "isTenPercentOwner")),
            officerTitle: fieldText(child(relationship, "officerTitle")),
        })
    }

    const rows: InsiderRow[] = []
    let order = 0
    for (const node of asArray(child(root, "nonDerivativeTable", "nonDerivativeTransaction"))) {
        const row = readRow(node, order, "transaction")
        order += 1
        if (row) rows.push(row)
    }
    for (const node of asArray(child(root, "nonDerivativeTable", "nonDerivativeHolding"))) {
        const row = readRow(node, order, "holding")
        order += 1
        if (row) rows.push(row)
    }

    return {
        formType: documentType,
        filedAt: null,
        periodOfReport: parseEdgarDate(fieldText(child(root, "periodOfReport"))),
        issuerCik: padCik(issuerCik),
        issuerName: fieldText(child(root, "issuer", "issuerName")) ?? ticker.toUpperCase(),
        ticker: ticker.toUpperCase(),
        owners,
        rows,
    }
}

export interface InsiderPosition {
    shares: number
    asOf: string
}

/**
 * Current common-stock position: the latest shares-following balance in each
 * direct/indirect bucket, summed. Derivative rows are not part of the input.
 * Transactions later in the document win when the dates tie.
 */
export function currentInsiderPosition(rows: InsiderRow[], fallbackAsOf: string | null): InsiderPosition | null {
    const groups = new Map<string, InsiderRow[]>()
    for (const row of rows) {
        if (!isCommonStockTitle(row.securityTitle) || row.sharesFollowing == null) continue
        const key = row.directOrIndirect || "D"
        const list = groups.get(key) ?? []
        list.push(row)
        groups.set(key, list)
    }
    if (groups.size === 0) return null

    let shares = 0
    let asOf = "0001-01-01"
    for (const group of groups.values()) {
        const latest = [...group].sort((a, b) => {
            const left = a.transactionDate ?? "0001-01-01"
            const right = b.transactionDate ?? "0001-01-01"
            if (left !== right) return left < right ? -1 : 1
            return a.order - b.order
        }).at(-1)
        if (!latest || latest.sharesFollowing == null) continue
        shares += latest.sharesFollowing
        const dated = latest.transactionDate ?? fallbackAsOf
        if (dated && dated > asOf) asOf = dated
    }
    if (asOf === "0001-01-01") return null
    return { shares, asOf }
}
