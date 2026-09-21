/**
 * Closed-form geometric Brownian motion fan chart.
 *
 * Every function here is pure and has no DOM or React dependency.
 *
 *   ln(S_t) ~ N(ln(S0) + (μ - σ²/2) t, σ² t)
 *
 * so the p-quantile is
 *
 *   S0 · exp((μ - σ²/2) t + σ √t · Φ⁻¹(p))
 *
 * and the mean is S0 · exp(μ t). Time is years: horizonDays / tradingDaysPerYear
 * (252 by default). Percentiles are closed-form; `seed` is ignored.
 */

import {
    DEFAULT_FORECAST_HORIZON_DAYS,
    FORECAST_SCENARIO_IDS,
    MAX_FORECAST_HORIZON_DAYS,
    MIN_FORECAST_HORIZON_DAYS,
    TRADING_DAYS_PER_YEAR,
    type ForecastAssumptionErrorCode,
    type ForecastErrorCode,
    type ForecastLlmJson,
    type ForecastPathPoint,
    type ForecastScenario,
    type ForecastScenarioOutcome,
    type ForecastSimulationInputs,
    type ForecastTerminal,
} from "@/types/forecast"

/** Φ⁻¹(0.10). Pair with `normCdf` in blackScholes: `normCdf(NORM_INV_10) ≈ 0.10`. */
export const NORM_INV_10 = -1.2815515655446004

/** Φ⁻¹(0.90). */
export const NORM_INV_90 = 1.2815515655446004

const PRICE_DECIMALS = 1e6
const PROBABILITY_TOLERANCE = 1e-6

export const FORECAST_MESSAGES: Record<ForecastErrorCode, string> = {
    "invalid-drift": "Expected return must be a finite number.",
    "invalid-volatility": "Volatility must be a finite number greater than or equal to zero.",
    "invalid-thesis": "A non-empty thesis is required.",
    "invalid-scenarios": "Provide exactly three scenarios: bear, base, and bull.",
    "probabilities-not-unit": "Scenario probabilities must be between 0 and 1 and sum to 1.",
    "missing-scenario": "Each of bear, base, and bull must appear exactly once.",
    "invalid-ticker": "Ticker is required.",
    "invalid-horizon": "Horizon must be a positive number of days.",
    "invalid-spot": "Spot price must be greater than zero.",
    "insufficient-history": "Not enough price history to estimate volatility.",
}

export interface ForecastSimulationResult {
    path: ForecastPathPoint[]
    terminal: ForecastTerminal
}

function roundPrice(price: number): number {
    return Math.round(price * PRICE_DECIMALS) / PRICE_DECIMALS
}

function returnPct(price: number, spot: number): number {
    if (!(spot > 0)) return 0
    return roundPrice((price - spot) / spot)
}

/** Year fraction for a day count, using 252 trading days unless overridden. */
export function yearsFromDays(
    days: number,
    tradingDaysPerYear: number = TRADING_DAYS_PER_YEAR
): number {
    if (!(tradingDaysPerYear > 0)) return 0
    return days / tradingDaysPerYear
}

/** GBM mean: S0 · exp(μ t). */
export function gbmMean(spot: number, drift: number, years: number): number {
    return spot * Math.exp(drift * years)
}

/**
 * GBM p-quantile for a given standard-normal z.
 * z = 0 is the median; `NORM_INV_10` / `NORM_INV_90` are the fan-chart wings.
 */
export function gbmQuantile(
    spot: number,
    drift: number,
    volatility: number,
    years: number,
    z: number
): number {
    if (!(years > 0) || !(volatility > 0)) {
        return gbmMean(spot, drift, years)
    }
    const driftAdj = drift - 0.5 * volatility * volatility
    return spot * Math.exp(driftAdj * years + volatility * Math.sqrt(years) * z)
}

function validateForecastScenarios(
    scenarios: ForecastScenario[]
): ForecastAssumptionErrorCode[] {
    const errors: ForecastAssumptionErrorCode[] = []

    if (!Array.isArray(scenarios) || scenarios.length !== FORECAST_SCENARIO_IDS.length) {
        return ["invalid-scenarios"]
    }

    const ids = scenarios.map((scenario) => scenario.id)
    const unique = new Set(ids)
    const hasEach = FORECAST_SCENARIO_IDS.every((id) => unique.has(id))
    if (unique.size !== FORECAST_SCENARIO_IDS.length || !hasEach) {
        errors.push("missing-scenario")
    }

    let probabilitySum = 0
    let probabilitiesOk = true
    for (const scenario of scenarios) {
        if (!Number.isFinite(scenario.drift)) errors.push("invalid-drift")
        if (typeof scenario.thesis !== "string" || scenario.thesis.trim().length === 0) {
            errors.push("invalid-thesis")
        }
        if (
            !Number.isFinite(scenario.probability) ||
            scenario.probability < 0 ||
            scenario.probability > 1
        ) {
            probabilitiesOk = false
        } else {
            probabilitySum += scenario.probability
        }
    }
    if (!probabilitiesOk || Math.abs(probabilitySum - 1) > PROBABILITY_TOLERANCE) {
        errors.push("probabilities-not-unit")
    }

    return [...new Set(errors)]
}

export function validateForecastAssumptions(
    json: ForecastLlmJson
): ForecastAssumptionErrorCode[] {
    const errors: ForecastAssumptionErrorCode[] = []

    if (!Number.isFinite(json.drift)) errors.push("invalid-drift")
    if (!Number.isFinite(json.volatility) || json.volatility < 0) errors.push("invalid-volatility")
    if (typeof json.thesis !== "string" || json.thesis.trim().length === 0) {
        errors.push("invalid-thesis")
    }
    errors.push(...validateForecastScenarios(json.scenarios))

    return [...new Set(errors)]
}

export function validateForecastSimulationInputs(
    inputs: ForecastSimulationInputs
): ForecastErrorCode[] {
    const errors: ForecastErrorCode[] = []
    const tradingDays = inputs.tradingDaysPerYear ?? TRADING_DAYS_PER_YEAR

    if (!(inputs.spot > 0) || !Number.isFinite(inputs.spot)) errors.push("invalid-spot")
    if (!Number.isFinite(inputs.drift)) errors.push("invalid-drift")
    if (!Number.isFinite(inputs.volatility) || inputs.volatility < 0) {
        errors.push("invalid-volatility")
    }
    if (!(inputs.horizonDays > 0) || !Number.isFinite(inputs.horizonDays)) {
        errors.push("invalid-horizon")
    }
    if (!(tradingDays > 0) || !Number.isFinite(tradingDays)) errors.push("invalid-horizon")

    return [...new Set(errors)]
}

/** API-level clamp; the engine itself accepts any positive horizon. */
export function clampForecastHorizon(horizonDays: number): number {
    if (!Number.isFinite(horizonDays)) return DEFAULT_FORECAST_HORIZON_DAYS
    return Math.min(MAX_FORECAST_HORIZON_DAYS, Math.max(MIN_FORECAST_HORIZON_DAYS, Math.round(horizonDays)))
}

function toUtcDateString(asOf: Date | string): string {
    if (typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) return asOf
    const date = asOf instanceof Date ? asOf : new Date(asOf)
    return date.toISOString().slice(0, 10)
}

function addUtcDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + Math.round(days))
    return date.toISOString().slice(0, 10)
}

function sampleDays(horizonDays: number, steps: number): number[] {
    if (steps <= 1) return [0]
    const days: number[] = []
    for (let i = 0; i < steps; i++) {
        if (i === 0) days.push(0)
        else if (i === steps - 1) days.push(horizonDays)
        else days.push((horizonDays * i) / (steps - 1))
    }
    return days
}

function orderedScenarios(scenarios: ForecastScenario[]): ForecastScenario[] {
    return FORECAST_SCENARIO_IDS.map(
        (id) => scenarios.find((scenario) => scenario.id === id)!
    )
}

function scenarioOutcome(
    scenario: ForecastScenario,
    spot: number,
    volatility: number,
    years: number
): ForecastScenarioOutcome {
    const price = roundPrice(gbmQuantile(spot, scenario.drift, volatility, years, 0))
    return {
        id: scenario.id,
        probability: scenario.probability,
        price,
        returnPct: returnPct(price, spot),
        thesis: scenario.thesis,
    }
}

function resolvedTradingDays(inputs: ForecastSimulationInputs): number {
    return inputs.tradingDaysPerYear ?? TRADING_DAYS_PER_YEAR
}

function resolvedSteps(inputs: ForecastSimulationInputs): number {
    const fallback = inputs.horizonDays + 1
    const steps = inputs.steps ?? fallback
    if (!Number.isFinite(steps) || steps < 2) return fallback
    return Math.floor(steps)
}

/**
 * Daily (or evenly spaced) p10 / p50 / p90 samples from day 0 through the horizon.
 * Day 0 is `asOf` and every percentile equals `spot`.
 */
export function buildForecastPath(
    inputs: ForecastSimulationInputs,
    asOf: Date | string
): ForecastPathPoint[] | null {
    if (validateForecastSimulationInputs(inputs).length > 0) return null

    const origin = toUtcDateString(asOf)
    const tradingDays = resolvedTradingDays(inputs)
    const days = sampleDays(inputs.horizonDays, resolvedSteps(inputs))

    return days.map((day) => {
        const years = yearsFromDays(day, tradingDays)
        const p10 = roundPrice(
            gbmQuantile(inputs.spot, inputs.drift, inputs.volatility, years, NORM_INV_10)
        )
        const p50 = roundPrice(
            gbmQuantile(inputs.spot, inputs.drift, inputs.volatility, years, 0)
        )
        const p90 = roundPrice(
            gbmQuantile(inputs.spot, inputs.drift, inputs.volatility, years, NORM_INV_90)
        )
        return {
            date: addUtcDays(origin, day),
            day,
            p10,
            p50,
            p90,
        }
    })
}

/**
 * Horizon snapshot: fan-chart percentiles, GBM mean, and one median price per
 * named scenario. Scenario order is always bear, base, bull.
 */
export function buildForecastTerminal(
    inputs: ForecastSimulationInputs,
    scenarios: ForecastScenario[],
    asOf: Date | string
): ForecastTerminal | null {
    if (validateForecastSimulationInputs(inputs).length > 0) return null
    if (validateForecastScenarios(scenarios).length > 0) return null

    const path = buildForecastPath(inputs, asOf)
    if (!path || path.length === 0) return null

    const last = path[path.length - 1]
    const years = yearsFromDays(inputs.horizonDays, resolvedTradingDays(inputs))
    const expected = roundPrice(gbmMean(inputs.spot, inputs.drift, years))

    return {
        date: last.date,
        p10: last.p10,
        p50: last.p50,
        p90: last.p90,
        expected,
        p10Return: returnPct(last.p10, inputs.spot),
        p50Return: returnPct(last.p50, inputs.spot),
        p90Return: returnPct(last.p90, inputs.spot),
        expectedReturn: returnPct(expected, inputs.spot),
        scenarios: orderedScenarios(scenarios).map((scenario) =>
            scenarioOutcome(scenario, inputs.spot, inputs.volatility, years)
        ),
    }
}

/**
 * Fan chart plus terminal distribution. Returns `null` when either the GBM
 * inputs or the scenario set fail validation, matching `calculateDcf`.
 */
export function simulateForecast(
    inputs: ForecastSimulationInputs,
    scenarios: ForecastScenario[],
    asOf: Date | string
): ForecastSimulationResult | null {
    const path = buildForecastPath(inputs, asOf)
    const terminal = buildForecastTerminal(inputs, scenarios, asOf)
    if (!path || !terminal) return null
    return { path, terminal }
}
