/** Where a valuation snapshot came from, surfaced in the UI for transparency. */
export type ValuationDataSource = "yahoo" | "fmp" | "mock"

/** Whether free cash flow is a fiscal year figure or a trailing twelve month one. */
export type FreeCashFlowBasis = "annual" | "ttm"

export interface FinancialYear {
    /** ISO date of the fiscal year end */
    date: string
    value: number
}

/** Everything the DCF model needs about a company, normalised across providers. */
export interface ValuationSnapshot {
    ticker: string
    companyName: string
    currency: string
    currentPrice: number
    marketCap?: number

    freeCashFlow: number
    freeCashFlowBasis: FreeCashFlowBasis
    sharesOutstanding: number
    /** Total debt minus cash; negative means the company holds net cash */
    netDebt: number
    totalDebt: number
    totalCash: number

    /** Oldest fiscal year first */
    freeCashFlowHistory: FinancialYear[]
    revenueHistory: FinancialYear[]
    /** Compound annual growth rates as decimals, null when not derivable */
    freeCashFlowGrowth: number | null
    revenueGrowth: number | null

    source: ValuationDataSource
    fetchedAt: string
}

export interface ValuationErrorResponse {
    error: string
    ticker: string
}
