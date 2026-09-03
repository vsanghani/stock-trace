/**
 * Pure financial maths for Stock Trace.
 *
 * Import from `@/lib/finance` rather than reaching into individual modules.
 */

export type {
    Action,
    BlackScholesInputs,
    Greeks,
    Leg,
    OptionLeg,
    OptionLegContract,
    OptionType,
    PayoffCurve,
    PayoffCurveOptions,
    PayoffPoint,
    StockLeg,
    Strategy,
    StrategyType,
} from "./types"

export {
    DEFAULT_DIVIDEND_YIELD,
    DEFAULT_RISK_FREE_RATE,
    blackScholesPrice,
    delta,
    gamma,
    greeks,
    impliedVolatility,
    intrinsicValue,
    normCdf,
    normPdf,
    rho,
    theta,
    vega,
    yearsToExpiry,
} from "./blackScholes"

export {
    DEFAULT_MULTIPLIER,
    buildCoveredCall,
    buildCustomStrategy,
    buildPayoffCurve,
    buildProtectivePut,
    buildSingleOption,
    buildStraddle,
    buildVerticalSpread,
    findBreakEvens,
    legCost,
    legProfitAtPrice,
    maxProfitAndLoss,
    netCost,
    optionLeg,
    payoffAtPrice,
    stockLeg,
} from "./payoff"
