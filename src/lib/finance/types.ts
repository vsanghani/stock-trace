/**
 * Core domain types for the finance engine.
 *
 * These are pricing-side types and are deliberately separate from the
 * market-data shapes in `@/types/options`, which model the raw Yahoo Finance
 * chain response.
 */

export type OptionType = "call" | "put"

export type Action = "buy" | "sell"

/**
 * A single option contract as used for payoff and pricing math.
 *
 * `premium` is quoted per share, matching how chains quote prices. The 100x
 * contract multiplier lives on the leg, not here.
 */
export interface OptionLegContract {
    type: OptionType
    strike: number
    premium: number
    /** ISO 8601 expiration date, when the leg came from a real chain */
    expiry?: string
    /** Annualised implied volatility as a decimal, e.g. 0.25 for 25% */
    impliedVolatility?: number
    /** Contract symbol from the market-data feed, for round-tripping to a quote */
    symbol?: string
}

export interface OptionLeg {
    kind: "option"
    action: Action
    /** Number of contracts, always positive; direction comes from `action` */
    quantity: number
    contract: OptionLegContract
    /** Shares per contract, defaults to 100 */
    multiplier?: number
}

export interface StockLeg {
    kind: "stock"
    action: Action
    /** Number of shares, always positive; direction comes from `action` */
    quantity: number
    entryPrice: number
}

export type Leg = OptionLeg | StockLeg

export type StrategyType =
    | "long-call"
    | "short-call"
    | "long-put"
    | "short-put"
    | "bull-call-spread"
    | "bear-call-spread"
    | "bull-put-spread"
    | "bear-put-spread"
    | "long-straddle"
    | "short-straddle"
    | "long-strangle"
    | "short-strangle"
    | "covered-call"
    | "protective-put"
    | "custom"

export interface Strategy {
    type: StrategyType
    label: string
    legs: Leg[]
    underlyingSymbol?: string
}

/** One sampled point on a payoff curve, evaluated at expiration. */
export interface PayoffPoint {
    /** Underlying price at expiration */
    price: number
    /** Total profit or loss in dollars across every leg */
    profit: number
    /** `profit` as a fraction of the absolute net cash outlay */
    profitPercent: number
}

export interface PayoffCurve {
    points: PayoffPoint[]
    /** Underlying prices where the position breaks even, ascending */
    breakEvens: number[]
    /** Dollar maximum, or `null` when the upside is unbounded */
    maxProfit: number | null
    /** Dollar minimum as a negative number, or `null` when the downside is unbounded */
    maxLoss: number | null
    /** Positive for a net debit paid, negative for a net credit received */
    netCost: number
}

export interface PayoffCurveOptions {
    minPrice?: number
    maxPrice?: number
    /** Number of evenly spaced samples, defaults to 121 */
    steps?: number
    /** Current underlying price, used to centre the default price range */
    spot?: number
}

export interface BlackScholesInputs {
    type: OptionType
    spot: number
    strike: number
    /** Time to expiration in years */
    timeToExpiry: number
    /** Annualised volatility as a decimal, e.g. 0.25 for 25% */
    volatility: number
    /** Annualised continuously compounded risk-free rate */
    riskFreeRate?: number
    /** Annualised continuous dividend yield */
    dividendYield?: number
}

/**
 * Greeks scaled for trader-facing display: `theta` is per calendar day, and
 * `vega` and `rho` are per one percentage point move in volatility and rates.
 */
export interface Greeks {
    delta: number
    gamma: number
    theta: number
    vega: number
    rho: number
}

/* ------------------------------------------------------------------ */
/* Discounted cash flow valuation                                     */
/* ------------------------------------------------------------------ */

/** All rates are decimals, so 0.10 means 10%. */
export interface DcfAssumptions {
    /** Annual free cash flow growth applied across the projection horizon */
    growthRate: number
    /** Discount rate, typically WACC */
    discountRate: number
    /** Perpetual growth rate applied beyond the horizon */
    terminalGrowthRate: number
    /** Projection horizon in years, defaults to 5 */
    years?: number
}

export interface DcfInputs {
    /** Trailing twelve month or latest annual free cash flow, in dollars */
    freeCashFlow: number
    sharesOutstanding: number
    /** Total debt minus cash; negative means net cash, which raises equity value */
    netDebt: number
    /** Current market price per share */
    currentPrice: number
    assumptions: DcfAssumptions
}

export interface ProjectedYear {
    year: number
    freeCashFlow: number
    discountFactor: number
    presentValue: number
}

export type ValuationVerdict = "undervalued" | "fairly-valued" | "overvalued"

export type ValuationErrorCode =
    | "invalid-free-cash-flow"
    | "invalid-shares"
    | "invalid-price"
    | "invalid-growth-rate"
    | "invalid-discount-rate"
    | "terminal-growth-too-high"
    | "invalid-horizon"

export type ValuationWarningCode =
    | "negative-free-cash-flow"
    | "terminal-value-dominant"
    | "narrow-discount-spread"
    | "aggressive-growth"

export interface DcfResult {
    /** Projected free cash flow for each year of the horizon */
    projections: ProjectedYear[]
    /** Present value of the explicit projection period */
    pvOfCashFlows: number
    /** Undiscounted terminal value at the end of the horizon */
    terminalValue: number
    pvOfTerminalValue: number
    enterpriseValue: number
    equityValue: number
    fairValuePerShare: number
    currentPrice: number
    /** Percentage points, so 25 means the fair value is 25% above the market price */
    marginOfSafety: number
    verdict: ValuationVerdict
    /** Fraction of enterprise value contributed by the terminal value, 0 to 1 */
    terminalValueWeight: number
    warnings: ValuationWarningCode[]
}

export interface SensitivityOptions {
    /** Number of steps either side of the base rate, defaults to 2 */
    steps?: number
    /** Growth rate spread at the furthest step, defaults to 0.04 */
    growthSpread?: number
    /** Discount rate spread at the furthest step, defaults to 0.02 */
    discountSpread?: number
}

export interface SensitivityCell {
    growthRate: number
    discountRate: number
    /** `null` when the assumptions make the model unsolvable */
    fairValuePerShare: number | null
    marginOfSafety: number | null
    verdict: ValuationVerdict | null
    /** True for the cell matching the user's current assumptions */
    isBase: boolean
}

export interface SensitivityMatrix {
    /** Column axis, ascending */
    growthRates: number[]
    /** Row axis, ascending */
    discountRates: number[]
    /** Indexed as `rows[discountRateIndex][growthRateIndex]` */
    rows: SensitivityCell[][]
    baseGrowthRate: number
    baseDiscountRate: number
    /** Extremes across solvable cells, for scaling a heatmap */
    minFairValue: number | null
    maxFairValue: number | null
}
