import { padCik } from "@/lib/holders/dates"

export type HolderSource = "13F" | "13D" | "13G" | "4"

export interface HolderPosition {
    holderCik: string
    holderName: string
    shares: number | null
    valueUsd: number | null
    percentOfClass: number | null
    source: HolderSource
    formType: string
    asOf: string
    filedAt: string
    accessionNumber: string
    filingUrl: string
}

export const MAJOR_HOLDER_LIMIT = 25

export const HOLDERS_DELAY_NOTE =
    "13F data is quarterly and delayed by up to 45 days. It covers long US-listed positions only."

function comparePosition(a: HolderPosition, b: HolderPosition): number {
    if (a.asOf !== b.asOf) return a.asOf < b.asOf ? -1 : 1
    if (a.filedAt !== b.filedAt) return a.filedAt < b.filedAt ? -1 : 1
    if (a.accessionNumber !== b.accessionNumber) return a.accessionNumber < b.accessionNumber ? -1 : 1
    return 0
}

function shareCount(position: HolderPosition): number {
    return position.shares ?? Number.NEGATIVE_INFINITY
}

/**
 * One current position per holder.
 * A 13D, 13G, or Form 4 position replaces a 13F position for the same CIK
 * when its as-of date is on or after the 13F report period. The later
 * override wins. A newer 13F is kept when the 13D/G or Form 4 is older.
 */
export function resolveHolders(positions: HolderPosition[]): HolderPosition[] {
    const grouped = new Map<string, HolderPosition[]>()
    for (const position of positions) {
        const key = padCik(position.holderCik)
        const list = grouped.get(key) ?? []
        list.push(position)
        grouped.set(key, list)
    }

    const winners: HolderPosition[] = []
    for (const group of grouped.values()) {
        const latestBySource = new Map<HolderSource, HolderPosition>()
        for (const position of group) {
            const previous = latestBySource.get(position.source)
            if (!previous || comparePosition(position, previous) > 0) {
                latestBySource.set(position.source, position)
            }
        }

        const from13f = latestBySource.get("13F")
        const overrides = (["13D", "13G", "4"] as const)
            .map((source) => latestBySource.get(source))
            .filter((position): position is HolderPosition => position != null)
            .filter((position) => !from13f || position.asOf >= from13f.asOf)

        if (overrides.length > 0) {
            overrides.sort(comparePosition)
            winners.push(overrides[overrides.length - 1])
        } else if (from13f) {
            winners.push(from13f)
        }
    }

    return winners.sort((a, b) => shareCount(b) - shareCount(a) || a.holderName.localeCompare(b.holderName))
}

/**
 * Largest holders, plus every 13D/13G filer so a 5% owner is not cut off
 * by a long tail of smaller 13F positions.
 */
export function selectMajorHolders(resolved: HolderPosition[], limit = MAJOR_HOLDER_LIMIT): HolderPosition[] {
    const sorted = [...resolved].sort((a, b) => shareCount(b) - shareCount(a) || a.holderName.localeCompare(b.holderName))
    const top = sorted.slice(0, limit)
    const seen = new Set(top.map((position) => padCik(position.holderCik)))
    const beneficial = sorted.filter(
        (position) => (position.source === "13D" || position.source === "13G") && !seen.has(padCik(position.holderCik)),
    )
    return [...top, ...beneficial]
}

export function panelAsOf(holders: HolderPosition[]): string | null {
    const institutional = holders.filter((holder) => holder.source === "13F").map((holder) => holder.asOf)
    const dates = institutional.length > 0 ? institutional : holders.map((holder) => holder.asOf)
    if (dates.length === 0) return null
    return dates.sort()[dates.length - 1]
}

export interface HoldersPayload {
    ticker: string
    holders: HolderPosition[]
    asOf: string | null
    count: number
    note: string
    unavailable: boolean
}

export function emptyHolders(ticker: string): HoldersPayload {
    return {
        ticker,
        holders: [],
        asOf: null,
        count: 0,
        note: HOLDERS_DELAY_NOTE,
        unavailable: true,
    }
}
