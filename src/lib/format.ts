/** Shared display formatters. Pure string helpers, safe on server or client. */

export function formatCurrency(value: number, currency = "USD", fractionDigits = 2): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value)
}

/** Large dollar figures as $1.23T / $96.7B / $412.5M. */
export function formatCompactCurrency(value: number, currency = "USD"): string {
    const magnitude = Math.abs(value)
    const sign = value < 0 ? "-" : ""
    const symbol = currency === "USD" ? "$" : ""

    const units: Array<{ limit: number; suffix: string }> = [
        { limit: 1e12, suffix: "T" },
        { limit: 1e9, suffix: "B" },
        { limit: 1e6, suffix: "M" },
        { limit: 1e3, suffix: "K" },
    ]

    for (const { limit, suffix } of units) {
        if (magnitude >= limit) {
            return `${sign}${symbol}${(magnitude / limit).toFixed(magnitude / limit >= 100 ? 0 : 1)}${suffix}`
        }
    }

    return `${sign}${symbol}${magnitude.toFixed(0)}`
}

/** Decimal rate to a percentage string, so 0.085 becomes "8.5%". */
export function formatRate(rate: number, fractionDigits = 1): string {
    return `${(rate * 100).toFixed(fractionDigits)}%`
}

/** Percentage-point value with an explicit sign, so 24.3 becomes "+24.3%". */
export function formatSignedPercent(value: number, fractionDigits = 1): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`
}

export function formatCount(value: number): string {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
}
