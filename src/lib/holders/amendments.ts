export type AmendmentKind = "ORIGINAL" | "RESTATEMENT" | "NEW_HOLDINGS" | "NOTICE"

export interface AmendmentLine {
    id?: number
    accessionNumber: string
    cusip: string
    putCall: string | null
    investmentDiscretion: string | null
    otherManager: string | null
    infotableSk: number
    shares?: number
    valueUsd?: number
    valueRaw?: number
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

function sumDefined(left: number | undefined, right: number | undefined): number | undefined {
    if (left == null && right == null) return undefined
    return (left ?? 0) + (right ?? 0)
}

/**
 * Combine lines in one filing that share CUSIP, put/call, investment discretion,
 * and other-manager. SEC 13F data sets do not contain true duplicates
 * (INFOTABLE_SK is unique), so those rows are separate lots and their shares
 * and values are summed. The higher INFOTABLE_SK supplies the other fields.
 */
export function dedupeLines<T extends AmendmentLine>(lines: T[]): T[] {
    const byKey = new Map<string, T>()
    for (const line of lines) {
        const key = lineKey(line)
        const previous = byKey.get(key)
        if (!previous) {
            byKey.set(key, line)
            continue
        }
        const primary = line.infotableSk >= previous.infotableSk ? line : previous
        const secondary = primary === line ? previous : line
        byKey.set(key, {
            ...primary,
            shares: sumDefined(primary.shares, secondary.shares),
            valueUsd: sumDefined(primary.valueUsd, secondary.valueUsd),
            valueRaw: sumDefined(primary.valueRaw, secondary.valueRaw),
        })
    }
    return [...byKey.values()]
}

/**
 * Apply 13F amendments in filing order.
 *
 * A restatement replaces the book for that filer and report period.
 * New holdings are added. A later filing replaces an active line with the same key.
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
