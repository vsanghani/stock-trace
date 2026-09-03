/**
 * Expiration payoff maths for multi-leg option strategies.
 *
 * The engine is leg-based rather than strategy-based: every named strategy is
 * just a particular `Leg[]`, so spreads, straddles, covered calls, condors and
 * anything else a user assembles by hand all flow through the same functions.
 *
 * Every function here is pure and has no DOM or React dependency.
 */

import { intrinsicValue } from "./blackScholes"
import type {
    Action,
    Leg,
    OptionLeg,
    OptionLegContract,
    PayoffCurve,
    PayoffCurveOptions,
    PayoffPoint,
    StockLeg,
    Strategy,
    StrategyType,
} from "./types"

export const DEFAULT_MULTIPLIER = 100

const DEFAULT_STEPS = 121

/** +1 for a long leg, -1 for a short leg. */
function direction(action: Action): number {
    return action === "buy" ? 1 : -1
}

function contractsToShares(leg: OptionLeg): number {
    return leg.quantity * (leg.multiplier ?? DEFAULT_MULTIPLIER)
}

export function optionLeg(
    action: Action,
    contract: OptionLegContract,
    quantity = 1,
    multiplier: number = DEFAULT_MULTIPLIER
): OptionLeg {
    return { kind: "option", action, quantity, contract, multiplier }
}

export function stockLeg(action: Action, quantity: number, entryPrice: number): StockLeg {
    return { kind: "stock", action, quantity, entryPrice }
}

/**
 * Cash paid (positive) or received (negative) to open a single leg.
 * Stock legs contribute their full notional, so a covered call reports the
 * real capital outlay rather than just the option premium.
 */
export function legCost(leg: Leg): number {
    return leg.kind === "option"
        ? direction(leg.action) * contractsToShares(leg) * leg.contract.premium
        : direction(leg.action) * leg.quantity * leg.entryPrice
}

/** Positive for a net debit paid, negative for a net credit received. */
export function netCost(legs: Leg[]): number {
    return legs.reduce((sum, leg) => sum + legCost(leg), 0)
}

/** Profit or loss for one leg if the underlying settles at `price`. */
export function legProfitAtPrice(leg: Leg, price: number): number {
    if (leg.kind === "stock") {
        return direction(leg.action) * leg.quantity * (price - leg.entryPrice)
    }

    const settlement = intrinsicValue(leg.contract.type, price, leg.contract.strike)
    return direction(leg.action) * contractsToShares(leg) * (settlement - leg.contract.premium)
}

/** Total profit or loss across every leg if the underlying settles at `price`. */
export function payoffAtPrice(legs: Leg[], price: number): number {
    return legs.reduce((sum, leg) => sum + legProfitAtPrice(leg, price), 0)
}

function strikesOf(legs: Leg[]): number[] {
    const strikes = legs
        .filter((leg): leg is OptionLeg => leg.kind === "option")
        .map((leg) => leg.contract.strike)
    return [...new Set(strikes)].sort((a, b) => a - b)
}

/**
 * Slope of the payoff, in dollars per point, above the highest strike.
 * Out-of-the-money puts are flat there, so only calls and stock contribute.
 */
function slopeAboveHighestStrike(legs: Leg[]): number {
    return legs.reduce((slope, leg) => {
        if (leg.kind === "stock") return slope + direction(leg.action) * leg.quantity
        if (leg.contract.type === "put") return slope
        return slope + direction(leg.action) * contractsToShares(leg)
    }, 0)
}

/**
 * The payoff is piecewise linear with kinks only at strikes, so evaluating the
 * strikes plus the price-zero boundary captures every extremum and every sign
 * change on the bounded part of the curve.
 */
function criticalPrices(legs: Leg[]): number[] {
    const strikes = strikesOf(legs)
    const references = [
        ...strikes,
        ...legs.filter((leg): leg is StockLeg => leg.kind === "stock").map((leg) => leg.entryPrice),
    ]
    const highest = references.length > 0 ? Math.max(...references) : 0
    const beyond = Math.max(highest * 2, highest + 100, 100)
    return [...new Set([0, ...strikes, beyond])].sort((a, b) => a - b)
}

function roundPrice(price: number): number {
    return Math.round(price * 1e6) / 1e6
}

/**
 * Underlying prices at which the position breaks even, ascending.
 *
 * Because the payoff is linear between strikes, interpolating across each
 * segment yields exact break-evens rather than grid approximations.
 */
export function findBreakEvens(legs: Leg[]): number[] {
    if (legs.length === 0) return []

    const prices = criticalPrices(legs)
    const found: number[] = []

    for (let i = 0; i < prices.length - 1; i++) {
        const low = prices[i]
        const high = prices[i + 1]
        const lowProfit = payoffAtPrice(legs, low)
        const highProfit = payoffAtPrice(legs, high)

        if (lowProfit === 0) found.push(low)
        if (highProfit === 0) found.push(high)
        if (lowProfit === 0 || highProfit === 0) continue

        const crossesZero = lowProfit < 0 !== highProfit < 0
        if (crossesZero) {
            found.push(low + ((high - low) * -lowProfit) / (highProfit - lowProfit))
        }
    }

    return [...new Set(found.map(roundPrice))].sort((a, b) => a - b)
}

/**
 * Best and worst dollar outcomes, where `null` means unbounded.
 * The downside is always bounded because the underlying cannot go below zero.
 */
export function maxProfitAndLoss(legs: Leg[]): {
    maxProfit: number | null
    maxLoss: number | null
} {
    if (legs.length === 0) return { maxProfit: 0, maxLoss: 0 }

    const outcomes = criticalPrices(legs).map((price) => payoffAtPrice(legs, price))
    const slope = slopeAboveHighestStrike(legs)

    return {
        maxProfit: slope > 0 ? null : Math.max(...outcomes),
        maxLoss: slope < 0 ? null : Math.min(...outcomes),
    }
}

function resolvePriceRange(
    legs: Leg[],
    options: PayoffCurveOptions
): { minPrice: number; maxPrice: number } {
    const references = [
        ...strikesOf(legs),
        ...legs.filter((leg): leg is StockLeg => leg.kind === "stock").map((leg) => leg.entryPrice),
        ...(options.spot !== undefined ? [options.spot] : []),
    ].filter((value) => Number.isFinite(value) && value > 0)

    const low = references.length > 0 ? Math.min(...references) : 0
    const high = references.length > 0 ? Math.max(...references) : 100

    const minPrice = options.minPrice ?? Math.max(0, low * 0.7)
    const maxPrice = options.maxPrice ?? Math.max(high * 1.3, minPrice + 1)

    return { minPrice, maxPrice: Math.max(maxPrice, minPrice + 1) }
}

/**
 * Sample the expiration payoff across a price range.
 *
 * Strikes inside the range are always included as sample points so the kinks
 * render exactly rather than being rounded off by the sampling grid.
 */
export function buildPayoffCurve(legs: Leg[], options: PayoffCurveOptions = {}): PayoffCurve {
    const { minPrice, maxPrice } = resolvePriceRange(legs, options)
    const steps = Math.max(2, Math.floor(options.steps ?? DEFAULT_STEPS))
    const cost = netCost(legs)
    const basis = Math.abs(cost)

    const prices = new Set<number>()
    for (let i = 0; i < steps; i++) {
        prices.add(roundPrice(minPrice + ((maxPrice - minPrice) * i) / (steps - 1)))
    }
    for (const strike of strikesOf(legs)) {
        if (strike >= minPrice && strike <= maxPrice) prices.add(roundPrice(strike))
    }

    const points: PayoffPoint[] = [...prices]
        .sort((a, b) => a - b)
        .map((price) => {
            const profit = payoffAtPrice(legs, price)
            return { price, profit, profitPercent: basis > 0 ? profit / basis : 0 }
        })

    return {
        points,
        breakEvens: findBreakEvens(legs),
        ...maxProfitAndLoss(legs),
        netCost: cost,
    }
}

function money(value: number): string {
    return value.toFixed(2).replace(/\.00$/, "")
}

export function buildSingleOption(
    action: Action,
    contract: OptionLegContract,
    quantity = 1
): Strategy {
    const type: StrategyType =
        action === "buy"
            ? contract.type === "call"
                ? "long-call"
                : "long-put"
            : contract.type === "call"
              ? "short-call"
              : "short-put"

    return {
        type,
        label: `${action === "buy" ? "Long" : "Short"} ${money(contract.strike)} ${contract.type === "call" ? "Call" : "Put"}`,
        legs: [optionLeg(action, contract, quantity)],
    }
}

/**
 * A two-leg vertical spread. Both contracts must share an option type; the
 * strategy is bullish when the long strike sits below the short strike.
 */
export function buildVerticalSpread(
    longContract: OptionLegContract,
    shortContract: OptionLegContract,
    quantity = 1
): Strategy {
    if (longContract.type !== shortContract.type) {
        throw new Error("A vertical spread requires both legs to be the same option type")
    }

    const bullish = longContract.strike < shortContract.strike
    const type: StrategyType =
        longContract.type === "call"
            ? bullish
                ? "bull-call-spread"
                : "bear-call-spread"
            : bullish
              ? "bull-put-spread"
              : "bear-put-spread"

    const lower = Math.min(longContract.strike, shortContract.strike)
    const upper = Math.max(longContract.strike, shortContract.strike)

    return {
        type,
        label: `${bullish ? "Bull" : "Bear"} ${longContract.type === "call" ? "Call" : "Put"} Spread ${money(lower)}/${money(upper)}`,
        legs: [
            optionLeg("buy", longContract, quantity),
            optionLeg("sell", shortContract, quantity),
        ],
    }
}

/** A straddle when the strikes match, a strangle when they differ. */
export function buildStraddle(
    action: Action,
    callContract: OptionLegContract,
    putContract: OptionLegContract,
    quantity = 1
): Strategy {
    if (callContract.type !== "call" || putContract.type !== "put") {
        throw new Error("A straddle requires one call contract and one put contract")
    }

    const wide = callContract.strike !== putContract.strike
    const long = action === "buy"
    const type: StrategyType = wide
        ? long
            ? "long-strangle"
            : "short-strangle"
        : long
          ? "long-straddle"
          : "short-straddle"

    const strikes = wide
        ? `${money(Math.min(putContract.strike, callContract.strike))}/${money(Math.max(putContract.strike, callContract.strike))}`
        : money(callContract.strike)

    return {
        type,
        label: `${long ? "Long" : "Short"} ${wide ? "Strangle" : "Straddle"} ${strikes}`,
        legs: [
            optionLeg(action, callContract, quantity),
            optionLeg(action, putContract, quantity),
        ],
    }
}

/** Long stock against a short call, sized to `quantity` contracts. */
export function buildCoveredCall(
    stockEntryPrice: number,
    callContract: OptionLegContract,
    quantity = 1,
    multiplier: number = DEFAULT_MULTIPLIER
): Strategy {
    if (callContract.type !== "call") {
        throw new Error("A covered call requires a call contract")
    }

    return {
        type: "covered-call",
        label: `Covered Call ${money(callContract.strike)}`,
        legs: [
            stockLeg("buy", quantity * multiplier, stockEntryPrice),
            optionLeg("sell", callContract, quantity, multiplier),
        ],
    }
}

/** Long stock against a long put, sized to `quantity` contracts. */
export function buildProtectivePut(
    stockEntryPrice: number,
    putContract: OptionLegContract,
    quantity = 1,
    multiplier: number = DEFAULT_MULTIPLIER
): Strategy {
    if (putContract.type !== "put") {
        throw new Error("A protective put requires a put contract")
    }

    return {
        type: "protective-put",
        label: `Protective Put ${money(putContract.strike)}`,
        legs: [
            stockLeg("buy", quantity * multiplier, stockEntryPrice),
            optionLeg("buy", putContract, quantity, multiplier),
        ],
    }
}

export function buildCustomStrategy(legs: Leg[], label = "Custom Strategy"): Strategy {
    return { type: "custom", label, legs }
}
