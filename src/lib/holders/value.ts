/**
 * Form 13F market values are reported in dollars for filings made on or after
 * 3 January 2023. Earlier filings report thousands of dollars.
 * See SEC Release No. 34-95148 and Form 13F Special Instruction 8.
 */
export const DOLLAR_VALUE_START = "2023-01-03"

export type ValueUnit = "dollars" | "thousands"

export interface NormalizedValue {
    valueUsd: number
    valueRaw: number
    unit: ValueUnit
    impliedPrice: number | null
    /** True when value/shares was about 1000x outside a share-price band and the value was rescaled. */
    unitCorrected: boolean
    /** True when value/shares is still outside the band after that 1000x check. */
    unitFlagged: boolean
}

/** Implied prices inside this band are left on the filing-date unit rule. */
export const PLAUSIBLE_SHARE_PRICE_MIN = 1
export const PLAUSIBLE_SHARE_PRICE_MAX = 1_000_000

function withPrice(value: Omit<NormalizedValue, "impliedPrice" | "unitCorrected" | "unitFlagged">, shares?: number): NormalizedValue {
    if (shares == null || !Number.isFinite(shares) || shares <= 0) {
        return { ...value, impliedPrice: null, unitCorrected: false, unitFlagged: false }
    }
    const impliedPrice = value.valueUsd / shares
    const plausible = impliedPrice >= PLAUSIBLE_SHARE_PRICE_MIN && impliedPrice <= PLAUSIBLE_SHARE_PRICE_MAX
    if (plausible) {
        return { ...value, impliedPrice, unitCorrected: false, unitFlagged: false }
    }

    const scaledDown = impliedPrice / 1000
    if (scaledDown >= PLAUSIBLE_SHARE_PRICE_MIN && scaledDown <= PLAUSIBLE_SHARE_PRICE_MAX) {
        return {
            ...value,
            valueUsd: value.valueUsd / 1000,
            unit: "dollars",
            impliedPrice: scaledDown,
            unitCorrected: true,
            unitFlagged: false,
        }
    }

    const scaledUp = impliedPrice * 1000
    if (scaledUp >= PLAUSIBLE_SHARE_PRICE_MIN && scaledUp <= PLAUSIBLE_SHARE_PRICE_MAX) {
        return {
            ...value,
            valueUsd: value.valueUsd * 1000,
            unit: "thousands",
            impliedPrice: scaledUp,
            unitCorrected: true,
            unitFlagged: false,
        }
    }

    return { ...value, impliedPrice, unitCorrected: false, unitFlagged: true }
}

export function normalize13fValue(raw: number, filedAt: string, shares?: number): NormalizedValue {
    if (!Number.isFinite(raw)) {
        throw new Error(`13F value is not a finite number: ${raw}`)
    }
    const byDate = filedAt < DOLLAR_VALUE_START
        ? { valueUsd: raw * 1000, valueRaw: raw, unit: "thousands" as const }
        : { valueUsd: raw, valueRaw: raw, unit: "dollars" as const }
    return withPrice(byDate, shares)
}
