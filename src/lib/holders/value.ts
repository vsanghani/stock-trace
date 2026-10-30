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
}

export function normalize13fValue(raw: number, filedAt: string): NormalizedValue {
    if (!Number.isFinite(raw)) {
        throw new Error(`13F value is not a finite number: ${raw}`)
    }
    if (filedAt < DOLLAR_VALUE_START) {
        return { valueUsd: raw * 1000, valueRaw: raw, unit: "thousands" }
    }
    return { valueUsd: raw, valueRaw: raw, unit: "dollars" }
}
