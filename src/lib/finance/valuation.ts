/**
 * Discounted cash flow valuation.
 *
 * Free cash flow is grown at a constant rate across the projection horizon,
 * discounted back to today, and capped with a Gordon Growth terminal value:
 *
 *   PV = sum(t=1..N) FCF0 * (1 + g)^t / (1 + r)^t + TV / (1 + r)^N
 *   TV = FCF_N * (1 + gTerm) / (r - gTerm)
 *
 * Enterprise value is then bridged to equity value by removing net debt, and
 * divided by shares outstanding to give a fair value per share.
 *
 * Every function here is pure and has no DOM or React dependency.
 */

import type {
    DcfAssumptions,
    DcfInputs,
    DcfResult,
    ProjectedYear,
    SensitivityCell,
    SensitivityMatrix,
    SensitivityOptions,
    ValuationErrorCode,
    ValuationVerdict,
    ValuationWarningCode,
} from "./types"

export const PROJECTION_YEARS = 5

/**
 * Margin of safety, in percentage points, that a valuation must clear before
 * it is called cheap or expensive rather than fairly valued.
 */
export const FAIR_VALUE_BAND = 10

export const DEFAULT_DCF_ASSUMPTIONS: Required<DcfAssumptions> = {
    growthRate: 0.08,
    discountRate: 0.09,
    terminalGrowthRate: 0.025,
    years: PROJECTION_YEARS,
}

export const DEFAULT_SENSITIVITY_OPTIONS: Required<SensitivityOptions> = {
    steps: 2,
    growthSpread: 0.04,
    discountSpread: 0.02,
}

/** Growth above this rate is flagged as difficult to sustain for five years. */
const AGGRESSIVE_GROWTH_THRESHOLD = 0.25

/** Above this share of enterprise value, the answer is mostly the terminal value. */
const TERMINAL_DOMINANCE_THRESHOLD = 0.85

/** Below this spread between discount and terminal growth, the model gets unstable. */
const NARROW_SPREAD_THRESHOLD = 0.01

export const VALUATION_MESSAGES: Record<ValuationErrorCode | ValuationWarningCode, string> = {
    "invalid-free-cash-flow": "Free cash flow must be a finite number.",
    "invalid-shares": "Shares outstanding must be greater than zero.",
    "invalid-price": "Current price must be greater than zero.",
    "invalid-growth-rate": "Growth rates must be finite numbers.",
    "invalid-discount-rate": "Discount rate must be greater than zero.",
    "terminal-growth-too-high": "Discount rate must be greater than the terminal growth rate.",
    "invalid-horizon": "The projection horizon must be at least one year.",
    "negative-free-cash-flow":
        "Free cash flow is negative, so a cash-flow model is a poor fit for this company.",
    "terminal-value-dominant":
        "Most of the value sits in the terminal value, so the result is highly sensitive to the perpetual growth rate.",
    "narrow-discount-spread":
        "The discount rate is close to the terminal growth rate, which inflates the terminal value.",
    "aggressive-growth": "Sustaining this growth rate for the full horizon is optimistic.",
}

function roundRate(rate: number): number {
    return Math.round(rate * 1e6) / 1e6
}

function horizonOf(assumptions: DcfAssumptions): number {
    return assumptions.years ?? PROJECTION_YEARS
}

/** Free cash flow for years 1 through `years`, compounding at `growthRate`. */
export function projectFreeCashFlows(
    freeCashFlow: number,
    growthRate: number,
    years: number = PROJECTION_YEARS
): number[] {
    const projected: number[] = []
    for (let year = 1; year <= years; year++) {
        projected.push(freeCashFlow * Math.pow(1 + growthRate, year))
    }
    return projected
}

/** Multiplier that converts a cash flow `periods` years out into today's dollars. */
export function discountFactor(discountRate: number, periods: number): number {
    return 1 / Math.pow(1 + discountRate, periods)
}

export function presentValue(amount: number, discountRate: number, periods: number): number {
    return amount * discountFactor(discountRate, periods)
}

/**
 * Gordon Growth terminal value from the final projected cash flow.
 * Returns `null` when the discount rate does not exceed terminal growth, since
 * the perpetuity does not converge.
 */
export function calculateTerminalValue(
    finalFreeCashFlow: number,
    discountRate: number,
    terminalGrowthRate: number
): number | null {
    const spread = discountRate - terminalGrowthRate
    if (!(spread > 0)) return null
    return (finalFreeCashFlow * (1 + terminalGrowthRate)) / spread
}

/** Percentage points by which fair value exceeds the market price. */
export function marginOfSafety(fairValuePerShare: number, currentPrice: number): number {
    if (!(currentPrice > 0)) return 0
    return ((fairValuePerShare - currentPrice) / currentPrice) * 100
}

export function classifyVerdict(marginOfSafetyPercent: number): ValuationVerdict {
    if (marginOfSafetyPercent > FAIR_VALUE_BAND) return "undervalued"
    if (marginOfSafetyPercent < -FAIR_VALUE_BAND) return "overvalued"
    return "fairly-valued"
}

/**
 * Blocking problems that make the model unsolvable.
 * An empty array means `calculateDcf` will return a result.
 */
export function validateDcfInputs(inputs: DcfInputs): ValuationErrorCode[] {
    const errors: ValuationErrorCode[] = []
    const { growthRate, discountRate, terminalGrowthRate } = inputs.assumptions
    const years = horizonOf(inputs.assumptions)

    if (!Number.isFinite(inputs.freeCashFlow)) errors.push("invalid-free-cash-flow")
    if (!(inputs.sharesOutstanding > 0)) errors.push("invalid-shares")
    if (!(inputs.currentPrice > 0)) errors.push("invalid-price")
    if (!Number.isFinite(growthRate) || !Number.isFinite(terminalGrowthRate)) {
        errors.push("invalid-growth-rate")
    }
    if (!(discountRate > 0)) errors.push("invalid-discount-rate")
    if (!(discountRate > terminalGrowthRate)) errors.push("terminal-growth-too-high")
    if (!(years >= 1)) errors.push("invalid-horizon")

    return [...new Set(errors)]
}

function collectWarnings(
    inputs: DcfInputs,
    terminalValueWeight: number
): ValuationWarningCode[] {
    const warnings: ValuationWarningCode[] = []
    const { growthRate, discountRate, terminalGrowthRate } = inputs.assumptions

    if (inputs.freeCashFlow <= 0) warnings.push("negative-free-cash-flow")
    if (growthRate > AGGRESSIVE_GROWTH_THRESHOLD) warnings.push("aggressive-growth")
    if (discountRate - terminalGrowthRate < NARROW_SPREAD_THRESHOLD) {
        warnings.push("narrow-discount-spread")
    }
    if (terminalValueWeight > TERMINAL_DOMINANCE_THRESHOLD) warnings.push("terminal-value-dominant")

    return warnings
}

/**
 * Run the model. Returns `null` when `validateDcfInputs` reports a blocking
 * problem, so callers can render the reasons without handling exceptions.
 */
export function calculateDcf(inputs: DcfInputs): DcfResult | null {
    if (validateDcfInputs(inputs).length > 0) return null

    const { freeCashFlow, sharesOutstanding, netDebt, currentPrice, assumptions } = inputs
    const { growthRate, discountRate, terminalGrowthRate } = assumptions
    const years = horizonOf(assumptions)

    const projections: ProjectedYear[] = projectFreeCashFlows(freeCashFlow, growthRate, years).map(
        (cashFlow, index) => {
            const year = index + 1
            const factor = discountFactor(discountRate, year)
            return {
                year,
                freeCashFlow: cashFlow,
                discountFactor: factor,
                presentValue: cashFlow * factor,
            }
        }
    )

    const pvOfCashFlows = projections.reduce((sum, entry) => sum + entry.presentValue, 0)
    const finalFreeCashFlow = projections[projections.length - 1].freeCashFlow

    const terminalValue = calculateTerminalValue(
        finalFreeCashFlow,
        discountRate,
        terminalGrowthRate
    )
    if (terminalValue === null) return null

    const pvOfTerminalValue = presentValue(terminalValue, discountRate, years)
    const enterpriseValue = pvOfCashFlows + pvOfTerminalValue
    const equityValue = enterpriseValue - netDebt
    const fairValuePerShare = equityValue / sharesOutstanding
    const margin = marginOfSafety(fairValuePerShare, currentPrice)
    const terminalValueWeight = enterpriseValue !== 0 ? pvOfTerminalValue / enterpriseValue : 0

    return {
        projections,
        pvOfCashFlows,
        terminalValue,
        pvOfTerminalValue,
        enterpriseValue,
        equityValue,
        fairValuePerShare,
        currentPrice,
        marginOfSafety: margin,
        verdict: classifyVerdict(margin),
        terminalValueWeight,
        warnings: collectWarnings(inputs, terminalValueWeight),
    }
}

/** Evenly spaced rates centred on `base`, reaching `spread` at the outermost step. */
function buildAxis(base: number, spread: number, steps: number): number[] {
    if (steps < 1) return [roundRate(base)]

    const increment = spread / steps
    const axis: number[] = []
    for (let step = -steps; step <= steps; step++) {
        axis.push(roundRate(base + step * increment))
    }
    return axis
}

/**
 * Fair value across a grid of growth and discount rates.
 *
 * Rows vary the discount rate and columns vary the growth rate, both ascending,
 * which matches how the heatmap is laid out on screen.
 */
export function buildSensitivityMatrix(
    inputs: DcfInputs,
    options: SensitivityOptions = {}
): SensitivityMatrix {
    const steps = options.steps ?? DEFAULT_SENSITIVITY_OPTIONS.steps
    const growthSpread = options.growthSpread ?? DEFAULT_SENSITIVITY_OPTIONS.growthSpread
    const discountSpread = options.discountSpread ?? DEFAULT_SENSITIVITY_OPTIONS.discountSpread

    const baseGrowthRate = roundRate(inputs.assumptions.growthRate)
    const baseDiscountRate = roundRate(inputs.assumptions.discountRate)

    const growthRates = buildAxis(inputs.assumptions.growthRate, growthSpread, steps)
    const discountRates = buildAxis(inputs.assumptions.discountRate, discountSpread, steps)

    const rows: SensitivityCell[][] = discountRates.map((discountRate) =>
        growthRates.map((growthRate) => {
            const result = calculateDcf({
                ...inputs,
                assumptions: { ...inputs.assumptions, growthRate, discountRate },
            })

            return {
                growthRate,
                discountRate,
                fairValuePerShare: result?.fairValuePerShare ?? null,
                marginOfSafety: result?.marginOfSafety ?? null,
                verdict: result?.verdict ?? null,
                isBase: growthRate === baseGrowthRate && discountRate === baseDiscountRate,
            }
        })
    )

    const solved = rows
        .flat()
        .map((cell) => cell.fairValuePerShare)
        .filter((value): value is number => value !== null)

    return {
        growthRates,
        discountRates,
        rows,
        baseGrowthRate,
        baseDiscountRate,
        minFairValue: solved.length > 0 ? Math.min(...solved) : null,
        maxFairValue: solved.length > 0 ? Math.max(...solved) : null,
    }
}

/**
 * Compound annual growth rate between two values.
 * Returns `null` when either endpoint is non-positive, since the growth rate of
 * a company that swung through zero is not meaningful.
 */
export function cagr(beginValue: number, endValue: number, years: number): number | null {
    if (!(beginValue > 0) || !(endValue > 0) || !(years > 0)) return null
    return Math.pow(endValue / beginValue, 1 / years) - 1
}

/**
 * CAGR across a chronologically ordered series, oldest first.
 * Used to derive the historical growth benchmark shown next to the slider.
 */
export function historicalGrowthRate(series: number[]): number | null {
    if (series.length < 2) return null
    return cagr(series[0], series[series.length - 1], series.length - 1)
}
