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
