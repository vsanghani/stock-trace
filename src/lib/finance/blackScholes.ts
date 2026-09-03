/**
 * Black-Scholes-Merton pricing and Greeks.
 *
 * Every function here is pure and has no DOM or React dependency.
 */

import type { BlackScholesInputs, Greeks, OptionType } from "./types"

/** Fallback short-term rate used when a caller has no live rate to pass in */
export const DEFAULT_RISK_FREE_RATE = 0.04

export const DEFAULT_DIVIDEND_YIELD = 0

const DAYS_PER_YEAR = 365
const SQRT_2PI = Math.sqrt(2 * Math.PI)

export function normPdf(x: number): number {
    return Math.exp(-0.5 * x * x) / SQRT_2PI
}

/**
 * Standard normal CDF via Abramowitz & Stegun 26.2.17,
 * accurate to roughly 7.5e-8 absolute error.
 */
export function normCdf(x: number): number {
    const b1 = 0.319381530
    const b2 = -0.356563782
    const b3 = 1.781477937
    const b4 = -1.821255978
    const b5 = 1.330274429
    const p = 0.2316419

    const absX = Math.abs(x)
    const t = 1 / (1 + p * absX)
    const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t
    const upper = 1 - normPdf(absX) * poly

    return x >= 0 ? upper : 1 - upper
}

export function intrinsicValue(type: OptionType, spot: number, strike: number): number {
    return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot)
}

/** Year fraction between two dates, floored at zero for expired contracts. */
export function yearsToExpiry(expiry: string | Date, from: Date = new Date()): number {
    const end = expiry instanceof Date ? expiry : new Date(expiry)
    const ms = end.getTime() - from.getTime()
    if (!Number.isFinite(ms)) return 0
    return Math.max(0, ms / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000))
}

interface ResolvedInputs {
    type: OptionType
    spot: number
    strike: number
    t: number
    vol: number
    r: number
    q: number
}

function resolve(inputs: BlackScholesInputs): ResolvedInputs {
    return {
        type: inputs.type,
        spot: inputs.spot,
        strike: inputs.strike,
        t: inputs.timeToExpiry,
        vol: inputs.volatility,
        r: inputs.riskFreeRate ?? DEFAULT_RISK_FREE_RATE,
        q: inputs.dividendYield ?? DEFAULT_DIVIDEND_YIELD,
    }
}

/**
 * At expiry, at zero volatility, or with a non-positive spot or strike the
 * model degenerates and the option is worth exactly its intrinsic value.
 */
function isDegenerate(i: ResolvedInputs): boolean {
    return !(i.t > 0) || !(i.vol > 0) || !(i.spot > 0) || !(i.strike > 0)
}

function dValues(i: ResolvedInputs): { d1: number; d2: number; sqrtT: number } {
    const sqrtT = Math.sqrt(i.t)
    const d1 =
        (Math.log(i.spot / i.strike) + (i.r - i.q + 0.5 * i.vol * i.vol) * i.t) / (i.vol * sqrtT)
    return { d1, d2: d1 - i.vol * sqrtT, sqrtT }
}

export function blackScholesPrice(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) return intrinsicValue(i.type, i.spot, i.strike)

    const { d1, d2 } = dValues(i)
    const discountedSpot = i.spot * Math.exp(-i.q * i.t)
    const discountedStrike = i.strike * Math.exp(-i.r * i.t)

    return i.type === "call"
        ? discountedSpot * normCdf(d1) - discountedStrike * normCdf(d2)
        : discountedStrike * normCdf(-d2) - discountedSpot * normCdf(-d1)
}

export function delta(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) {
        const itm = intrinsicValue(i.type, i.spot, i.strike) > 0
        if (!itm) return 0
        return i.type === "call" ? 1 : -1
    }

    const { d1 } = dValues(i)
    const carry = Math.exp(-i.q * i.t)
    return i.type === "call" ? carry * normCdf(d1) : carry * (normCdf(d1) - 1)
}

export function gamma(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) return 0

    const { d1, sqrtT } = dValues(i)
    return (Math.exp(-i.q * i.t) * normPdf(d1)) / (i.spot * i.vol * sqrtT)
}

/** Theta per calendar day. */
export function theta(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) return 0

    const { d1, d2, sqrtT } = dValues(i)
    const carry = Math.exp(-i.q * i.t)
    const discount = Math.exp(-i.r * i.t)
    const decay = -(i.spot * carry * normPdf(d1) * i.vol) / (2 * sqrtT)

    const annual =
        i.type === "call"
            ? decay - i.r * i.strike * discount * normCdf(d2) + i.q * i.spot * carry * normCdf(d1)
            : decay + i.r * i.strike * discount * normCdf(-d2) - i.q * i.spot * carry * normCdf(-d1)

    return annual / DAYS_PER_YEAR
}

/** Vega per one percentage point change in volatility. */
export function vega(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) return 0

    const { d1, sqrtT } = dValues(i)
    return (i.spot * Math.exp(-i.q * i.t) * normPdf(d1) * sqrtT) / 100
}

/** Rho per one percentage point change in the risk-free rate. */
export function rho(inputs: BlackScholesInputs): number {
    const i = resolve(inputs)
    if (isDegenerate(i)) return 0

    const { d2 } = dValues(i)
    const discounted = i.strike * i.t * Math.exp(-i.r * i.t)
    return (i.type === "call" ? discounted * normCdf(d2) : -discounted * normCdf(-d2)) / 100
}

export function greeks(inputs: BlackScholesInputs): Greeks {
    return {
        delta: delta(inputs),
        gamma: gamma(inputs),
        theta: theta(inputs),
        vega: vega(inputs),
        rho: rho(inputs),
    }
}

const IV_MIN = 1e-4
const IV_MAX = 5
const IV_TOLERANCE = 1e-6
const IV_MAX_ITERATIONS = 100

/**
 * Solve for the volatility that reproduces `marketPrice`.
 *
 * Newton-Raphson converges in a handful of steps for most quotes; the bisection
 * fallback covers deep ITM/OTM contracts where vega collapses toward zero.
 * Returns `null` when the price is outside the no-arbitrage bounds.
 */
export function impliedVolatility(
    marketPrice: number,
    inputs: Omit<BlackScholesInputs, "volatility">
): number | null {
    if (!(marketPrice > 0)) return null

    const priceAt = (volatility: number) => blackScholesPrice({ ...inputs, volatility })

    if (marketPrice < priceAt(IV_MIN) - IV_TOLERANCE) return null
    if (marketPrice > priceAt(IV_MAX)) return null

    let volatility = 0.3
    for (let n = 0; n < IV_MAX_ITERATIONS; n++) {
        const diff = priceAt(volatility) - marketPrice
        if (Math.abs(diff) < IV_TOLERANCE) return volatility

        // vega() is per percentage point, so scale back to per unit of volatility
        const slope = vega({ ...inputs, volatility }) * 100
        if (!(slope > 1e-8)) break

        const next = volatility - diff / slope
        if (!Number.isFinite(next) || next <= IV_MIN || next >= IV_MAX) break
        volatility = next
    }

    let low = IV_MIN
    let high = IV_MAX
    for (let n = 0; n < IV_MAX_ITERATIONS; n++) {
        const mid = (low + high) / 2
        const diff = priceAt(mid) - marketPrice
        if (Math.abs(diff) < IV_TOLERANCE) return mid
        if (diff > 0) high = mid
        else low = mid
    }

    return (low + high) / 2
}
