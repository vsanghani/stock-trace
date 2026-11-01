/**
 * Form 13F market values are reported in dollars for filings made on or after
 * 3 January 2023. Earlier filings report thousands of dollars.
 * See SEC Release No. 34-95148 and Form 13F Special Instruction 8.
 *
 * A second pass compares each line's implied price with the median for the
 * same CUSIP and report period. It rescales only when that price is about
 * 1000x off a median drawn from enough filers. There is no absolute price
 * band: a correctly reported sub-$1 stock stays as filed.
 */
export const DOLLAR_VALUE_START = "2023-01-03"

/** One price per filer. Fewer than this and the median is not used to rescale. */
export const MIN_FILERS_FOR_PRICE_MEDIAN = 5

/** log10(1000). A ratio within 10^0.1 of 1000 (about 794x to 1259x) counts. */
const THOUSAND_FOLD_LOG = 3
const THOUSAND_FOLD_TOLERANCE = 0.1

export type ValueUnit = "dollars" | "thousands"

export interface NormalizedValue {
    valueUsd: number
    valueRaw: number
    unit: ValueUnit
    impliedPrice: number | null
    /** True when the value was divided or multiplied by 1000 to match the peer median. */
    unitCorrected: boolean
    /** True when the line was left on the date rule and marked for review instead of rescaled. */
    unitFlagged: boolean
}

export interface PriceCheckLine {
    cusip: string
    reportPeriod: string
    filerCik: string
    valueUsd: number
    shares: number
    valueUnit: ValueUnit
    putCall?: string | null
    shareType?: string | null
}

export interface ReconciledPriceLine extends PriceCheckLine {
    impliedPrice: number | null
    unitCorrected: boolean
    unitFlagged: boolean
}

export function normalize13fValue(raw: number, filedAt: string, shares?: number): NormalizedValue {
    if (!Number.isFinite(raw)) {
        throw new Error(`13F value is not a finite number: ${raw}`)
    }
    const byDate = filedAt < DOLLAR_VALUE_START
        ? { valueUsd: raw * 1000, valueRaw: raw, unit: "thousands" as const }
        : { valueUsd: raw, valueRaw: raw, unit: "dollars" as const }
    const impliedPrice = shares != null && Number.isFinite(shares) && shares > 0 ? byDate.valueUsd / shares : null
    return { ...byDate, impliedPrice, unitCorrected: false, unitFlagged: false }
}

function isLongEquity(line: PriceCheckLine): boolean {
    if (line.putCall) return false
    const shareType = (line.shareType ?? "SH").toUpperCase()
    return shareType === "SH" && line.shares > 0 && Number.isFinite(line.valueUsd)
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 1) return sorted[mid]
    return (sorted[mid - 1] + sorted[mid]) / 2
}

/** "high" means the line's price is about 1000x the median; "low" means about 1/1000. */
function thousandFold(ratio: number): "high" | "low" | null {
    if (!(ratio > 0) || !Number.isFinite(ratio)) return null
    const log = Math.log10(ratio)
    if (Math.abs(log - THOUSAND_FOLD_LOG) <= THOUSAND_FOLD_TOLERANCE) return "high"
    if (Math.abs(-log - THOUSAND_FOLD_LOG) <= THOUSAND_FOLD_TOLERANCE) return "low"
    return null
}

/**
 * Adjust 13F values that disagree with other filers of the same security by
 * about 1000x. The median is one share-weighted price per filer. Below
 * MIN_FILERS_FOR_PRICE_MEDIAN the date-rule value is kept and the line is
 * flagged. Puts, calls, and principal-amount rows are left unchanged.
 */
export function reconcileImpliedPrices<T extends PriceCheckLine>(lines: readonly T[]): Array<T & ReconciledPriceLine> {
    const members = new Map<string, T[]>()
    for (const line of lines) {
        if (!isLongEquity(line)) continue
        const key = `${line.cusip}|${line.reportPeriod}`
        const list = members.get(key) ?? []
        list.push(line)
        members.set(key, list)
    }

    const decisions = new Map<T, { valueUsd: number; valueUnit: ValueUnit; impliedPrice: number; unitCorrected: boolean; unitFlagged: boolean }>()

    for (const group of members.values()) {
        const byFiler = new Map<string, { value: number; shares: number }>()
        for (const line of group) {
            const current = byFiler.get(line.filerCik) ?? { value: 0, shares: 0 }
            current.value += line.valueUsd
            current.shares += line.shares
            byFiler.set(line.filerCik, current)
        }
        const filerPrices = [...byFiler.values()].filter((row) => row.shares > 0).map((row) => row.value / row.shares)
        const enough = filerPrices.length >= MIN_FILERS_FOR_PRICE_MEDIAN
        const peerMedian = enough ? median(filerPrices) : null

        for (const line of group) {
            const impliedPrice = line.valueUsd / line.shares
            if (peerMedian == null || peerMedian <= 0) {
                decisions.set(line, {
                    valueUsd: line.valueUsd,
                    valueUnit: line.valueUnit,
                    impliedPrice,
                    unitCorrected: false,
                    unitFlagged: true,
                })
                continue
            }
            const fold = thousandFold(impliedPrice / peerMedian)
            if (fold === "high") {
                const valueUsd = line.valueUsd / 1000
                decisions.set(line, {
                    valueUsd,
                    valueUnit: "dollars",
                    impliedPrice: valueUsd / line.shares,
                    unitCorrected: true,
                    unitFlagged: false,
                })
            } else if (fold === "low") {
                const valueUsd = line.valueUsd * 1000
                decisions.set(line, {
                    valueUsd,
                    valueUnit: "thousands",
                    impliedPrice: valueUsd / line.shares,
                    unitCorrected: true,
                    unitFlagged: false,
                })
            } else {
                decisions.set(line, {
                    valueUsd: line.valueUsd,
                    valueUnit: line.valueUnit,
                    impliedPrice,
                    unitCorrected: false,
                    unitFlagged: false,
                })
            }
        }
    }

    return lines.map((line) => {
        const decision = decisions.get(line)
        if (!decision) {
            const impliedPrice = line.shares > 0 && Number.isFinite(line.valueUsd) ? line.valueUsd / line.shares : null
            return { ...line, impliedPrice, unitCorrected: false, unitFlagged: false }
        }
        return { ...line, ...decision }
    })
}
