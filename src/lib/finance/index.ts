/**
 * Pure financial maths for Plutox.
 *
 * Import from `@/lib/finance` rather than reaching into individual modules.
 */

export type {
    Action,
    BlackScholesInputs,
    DcfAssumptions,
    DcfInputs,
    DcfResult,
    Greeks,
    Leg,
    OptionLeg,
    OptionLegContract,
    OptionType,
    PayoffCurve,
    PayoffCurveOptions,
    PayoffPoint,
    ProjectedYear,
    SensitivityCell,
    SensitivityMatrix,
    SensitivityOptions,
    StockLeg,
    Strategy,
    StrategyType,
    ValuationErrorCode,
    ValuationVerdict,
    ValuationWarningCode,
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

export {
    DEFAULT_DCF_ASSUMPTIONS,
    DEFAULT_SENSITIVITY_OPTIONS,
    FAIR_VALUE_BAND,
    PROJECTION_YEARS,
    VALUATION_MESSAGES,
    buildSensitivityMatrix,
    cagr,
    calculateDcf,
    calculateTerminalValue,
    classifyVerdict,
    discountFactor,
    historicalGrowthRate,
    marginOfSafety,
    presentValue,
    projectFreeCashFlows,
    validateDcfInputs,
} from "./valuation"
