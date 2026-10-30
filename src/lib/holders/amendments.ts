export type AmendmentKind = "ORIGINAL" | "RESTATEMENT" | "NEW_HOLDINGS" | "NOTICE"

export interface AmendmentLine {
    id?: number
    accessionNumber: string
    cusip: string
    putCall: string | null
    investmentDiscretion: string | null
    otherManager: string | null
    infotableSk: number
    superseded?: boolean
}

export interface AmendmentFiling<T extends AmendmentLine = AmendmentLine> {
    accessionNumber: string
    filedAt: string
    submissionType: string
    isAmendment: boolean
    amendmentType: string | null
    holdings: T[]
}

export function lineKey(line: Pick<AmendmentLine, "cusip" | "putCall" | "investmentDiscretion" | "otherManager">): string {
    return [
        line.cusip.toUpperCase(),
        line.putCall ?? "",
        (line.investmentDiscretion ?? "").toUpperCase(),
        line.otherManager ?? "",
    ].join("|")
}

export function classifyAmendment(input: {
    submissionType: string
    isAmendment: boolean
    amendmentType: string | null
}): AmendmentKind {
    const submission = input.submissionType.toUpperCase().trim()
    if (submission.startsWith("13F-NT")) return "NOTICE"
    const label = (input.amendmentType ?? "")
        .toUpperCase()
        .replace(/[_/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    const amended = input.isAmendment || submission.endsWith("/A")
    if (!amended) return "ORIGINAL"
    if (label.includes("NEW") && label.includes("HOLD")) return "NEW_HOLDINGS"
    return "RESTATEMENT"
}

export function compareFilingOrder(a: { filedAt: string; accessionNumber: string }, b: { filedAt: string; accessionNumber: string }): number {
    if (a.filedAt !== b.filedAt) return a.filedAt < b.filedAt ? -1 : 1
    if (a.accessionNumber !== b.accessionNumber) return a.accessionNumber < b.accessionNumber ? -1 : 1
    return 0
}

/** Collapse exact duplicate lines in one filing. The highest INFOTABLE_SK wins. */
export function dedupeLines<T extends AmendmentLine>(lines: T[]): T[] {
    const byKey = new Map<string, T>()
    for (const line of lines) {
        const key = lineKey(line)
        const prev = byKey.get(key)
        if (!prev || line.infotableSk >= prev.infotableSk) byKey.set(key, line)
    }
    return [...byKey.values()]
}

/**
 * Apply 13F amendments in filing order.
 *
 * A restatement replaces the book for that filer and report period.
 * New holdings are added. A repeated position key is replaced by the later line.
 * 13F-NT notices are ignored. Amendments with no type are treated as restatements.
 * Superseded lines are kept on the result so callers can persist the flag.
 */
export function applyAmendments<T extends AmendmentLine>(filings: AmendmentFiling<T>[]): Array<T & { superseded: boolean }> {
    const ordered = [...filings].sort(compareFilingOrder)
    let book: Array<T & { superseded: boolean }> = []

    for (const filing of ordered) {
        const kind = classifyAmendment(filing)
        if (kind === "NOTICE") continue
        const incoming = dedupeLines(filing.holdings).map((line) => ({
            ...line,
            accessionNumber: filing.accessionNumber,
            superseded: false as const,
        }))

        if (kind === "NEW_HOLDINGS" && book.some((line) => !line.superseded)) {
            const incomingKeys = new Set(incoming.map((line) => lineKey(line)))
            book = [
                ...book.map((line) =>
                    !line.superseded && incomingKeys.has(lineKey(line))
                        ? { ...line, superseded: true }
                        : line,
                ),
                ...incoming,
            ]
            continue
        }

        book = [
            ...book.map((line) => (line.superseded ? line : { ...line, superseded: true })),
            ...incoming,
        ]
    }

    return book
}

export interface LongPosition {
    cusip: string
    shares: number
    valueUsd: number
}

/** Sum active long-equity lines. Puts, calls, and principal-amount rows are excluded. */
export function aggregateLongEquity(
    lines: Array<{
        cusip: string
        shares: number
        valueUsd: number
        putCall?: string | null
        shareType?: string | null
        superseded?: boolean
    }>,
): LongPosition[] {
    const totals = new Map<string, LongPosition>()
    for (const line of lines) {
        if (line.superseded) continue
        if (line.putCall) continue
        const shareType = (line.shareType ?? "SH").toUpperCase()
        if (shareType && shareType !== "SH") continue
        const cusip = line.cusip.toUpperCase()
        const current = totals.get(cusip) ?? { cusip, shares: 0, valueUsd: 0 }
        current.shares += line.shares
        current.valueUsd += line.valueUsd
        totals.set(cusip, current)
    }
    return [...totals.values()].sort((a, b) => a.cusip.localeCompare(b.cusip))
}
