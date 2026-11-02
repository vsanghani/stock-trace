const MONTHS: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
}

/** Normalise EDGAR date strings to YYYY-MM-DD. */
export function parseEdgarDate(value: string | null | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

    const mon = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(trimmed)
    if (mon) {
        const month = MONTHS[mon[2].toUpperCase()]
        if (!month) return null
        return `${mon[3]}-${month}-${mon[1].padStart(2, "0")}`
    }

    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
    if (us) {
        return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`
    }

    const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed)
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`

    return null
}

export function padCik(cik: string | number): string {
    const digits = String(cik).replace(/\D/g, "")
    return digits.padStart(10, "0")
}

export function normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase()
}

export function todayIso(now = new Date()): string {
    return now.toISOString().slice(0, 10)
}

/** Previous weekday in UTC. SEC does not publish a daily index on weekends. */
export function previousBusinessDay(isoDate: string): string {
    const parsed = parseEdgarDate(isoDate)
    if (!parsed) throw new Error(`Invalid date: ${isoDate}`)
    const [year, month, day] = parsed.split("-").map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    do {
        date.setUTCDate(date.getUTCDate() - 1)
    } while (date.getUTCDay() === 0 || date.getUTCDay() === 6)
    return date.toISOString().slice(0, 10)
}

export function quarterOf(month: number): 1 | 2 | 3 | 4 {
    return (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4
}

export function quarterEnd(year: number, quarter: 1 | 2 | 3 | 4): string {
    const ends = ["03-31", "06-30", "09-30", "12-31"] as const
    return `${year}-${ends[quarter - 1]}`
}

/** Most recent calendar quarter-end on or before an ISO date. */
export function latestQuarterEnd(isoDate: string): string {
    const parsed = parseEdgarDate(isoDate)
    if (!parsed) throw new Error(`Invalid date: ${isoDate}`)
    const year = Number(parsed.slice(0, 4))
    const ends: string[] = []
    for (const quarter of [1, 2, 3, 4] as const) {
        const end = quarterEnd(year, quarter)
        if (end <= parsed) ends.push(end)
    }
    if (ends.length > 0) return ends[ends.length - 1]
    return quarterEnd(year - 1, 4)
}

function previousQuarterEnd(isoDate: string): string {
    const year = Number(isoDate.slice(0, 4))
    const month = Number(isoDate.slice(5, 7))
    const quarter = quarterOf(month)
    if (quarter === 1) return quarterEnd(year - 1, 4)
    return quarterEnd(year, (quarter - 1) as 1 | 2 | 3 | 4)
}

/**
 * Report periods kept in Postgres. Older quarters are skipped.
 * Archiving them to Parquet is a follow-up and is not implemented.
 */
export const RETAINED_QUARTER_COUNT = 8

export function retainedQuarterEnds(asOf: string, count = RETAINED_QUARTER_COUNT): string[] {
    const ends: string[] = []
    let cursor = latestQuarterEnd(asOf)
    for (let i = 0; i < count; i += 1) {
        ends.push(cursor)
        cursor = previousQuarterEnd(cursor)
    }
    return ends.reverse()
}

export function earliestRetainedPeriod(asOf: string, count = RETAINED_QUARTER_COUNT): string {
    return retainedQuarterEnds(asOf, count)[0]
}

export function isWithinRetention(period: string, asOf: string, count = RETAINED_QUARTER_COUNT): boolean {
    const parsed = parseEdgarDate(period)
    if (!parsed) return false
    return parsed >= earliestRetainedPeriod(asOf, count)
}
