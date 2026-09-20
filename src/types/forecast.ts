/**
 * Price-path forecast contract.
 *
 * Three layers share these types:
 *
 * 1. The LLM returns `ForecastLlmJson` — assumptions only, never a price series.
 * 2. The local GBM engine consumes `ForecastSimulationInputs` and emits the
 *    fan-chart path plus terminal distribution.
 * 3. `GET /api/forecast/[ticker]` returns `ForecastResult` to the client.
 *
 * Rates are decimals: 0.25 means 25%. Prices are in the listing currency.
 * The LLM must not emit a predicted close; `spot` always comes from market data.
 */

/* ------------------------------------------------------------------ */
/* Horizons and engine constants                                       */
/* ------------------------------------------------------------------ */

/** Preset horizons offered in the UI. The API also accepts any integer in range. */
export const FORECAST_HORIZON_OPTIONS = [30, 90, 180, 365] as const

export type ForecastHorizonDays = (typeof FORECAST_HORIZON_OPTIONS)[number]

export const DEFAULT_FORECAST_HORIZON_DAYS: ForecastHorizonDays = 90

export const MIN_FORECAST_HORIZON_DAYS = 7

export const MAX_FORECAST_HORIZON_DAYS = 365

/** Percentiles materialised on every path point and at the horizon. */
export const FORECAST_PERCENTILES = [10, 50, 90] as const

export type ForecastPercentile = (typeof FORECAST_PERCENTILES)[number]

/** Closed-form geometric Brownian motion. The only engine in v1. */
export const FORECAST_ENGINE = "gbm" as const

export type ForecastEngine = typeof FORECAST_ENGINE

/** Used to convert calendar `horizonDays` into years for the GBM. */
export const TRADING_DAYS_PER_YEAR = 252

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

/** Inputs to `GET /api/forecast/[ticker]?horizonDays=90`. */
export interface ForecastRequest {
    ticker: string
    /** Calendar days ahead. Defaults to 90, clamped to 7–365. */
    horizonDays?: number
}

/* ------------------------------------------------------------------ */
/* LLM JSON — the model is only allowed to return this shape           */
/* ------------------------------------------------------------------ */

export type ForecastScenarioId = "bear" | "base" | "bull"

export const FORECAST_SCENARIO_IDS: readonly ForecastScenarioId[] = [
    "bear",
    "base",
    "bull",
]

/**
 * One named scenario. The three rows in `ForecastLlmJson.scenarios` must
 * include each id exactly once, and their probabilities must sum to 1.
 */
export interface ForecastScenario {
    id: ForecastScenarioId
    /** Probability mass from 0 to 1. The three scenarios must sum to 1. */
    probability: number
    /**
     * Annualised expected return μ under this scenario.
     * The engine turns this into a median terminal price; the LLM must not
     * send a dollar target.
     */
    drift: number
    /** One or two sentences on what would have to happen. */
    thesis: string
}

/**
 * Strict JSON the OpenRouter completion must return. Parsed, then validated
 * into `ForecastAssumptions`. No price fields, no path, no dates.
 */
export interface ForecastLlmJson {
    /**
     * Annualised expected return μ used for the simulated median path.
     * Typically close to the base scenario's drift.
     */
    drift: number
    /** Annualised volatility σ. Should be grounded in realized vol from context. */
    volatility: number
    /** Short research thesis for the base path, one or two sentences. */
    thesis: string
    scenarios: ForecastScenario[]
}

/**
 * Validated copy of `ForecastLlmJson`. Same fields; the difference is that
 * this object has already passed `validateForecastAssumptions`.
 */
export type ForecastAssumptions = ForecastLlmJson

/**
 * Facts assembled server-side and stuffed into the LLM prompt.
 * Not a required field on `ForecastResult`; a trimmed subset is stored as
 * `anchors` so the UI can show what the forecast was based on.
 */
export interface ForecastLlmContext {
    ticker: string
    companyName: string
    currency: string
    spot: number
    horizonDays: number
    /** Annualised realized volatility from recent history, when available. */
    realizedVolatility: number | null
    beta: number | null
    analystMeanTarget: number | null
    dcfFairValue: number | null
    sentimentScore: number | null
    sentimentReason: string | null
    recentHeadlines: string[]
}

/**
 * Canonical fixture for the LLM JSON contract. Use this in the system prompt
 * ("return JSON matching this shape") and as a parser test case.
 */
export const FORECAST_LLM_JSON_EXAMPLE: ForecastLlmJson = {
    drift: 0.1,
    volatility: 0.28,
    thesis: "Earnings growth remains intact and the balance sheet can fund the current buyback pace.",
    scenarios: [
        {
            id: "bear",
            probability: 0.25,
            drift: -0.15,
            thesis: "A demand miss and multiple compression take the stock back toward recent lows.",
        },
        {
            id: "base",
            probability: 0.5,
            drift: 0.1,
            thesis: "Revenue compounds in line with the last few years and the multiple holds.",
        },
        {
            id: "bull",
            probability: 0.25,
            drift: 0.35,
            thesis: "A beat-and-raise cycle plus a higher terminal multiple re-rates the shares.",
        },
    ],
}

/* ------------------------------------------------------------------ */
/* Local engine                                                        */
/* ------------------------------------------------------------------ */

/**
 * Everything the GBM needs. `drift` and `volatility` come from assumptions;
 * `spot`, horizon, and `seed` come from the server.
 */
export interface ForecastSimulationInputs {
    spot: number
    /** Annualised expected return μ */
    drift: number
    /** Annualised volatility σ */
    volatility: number
    horizonDays: number
    /** Defaults to `TRADING_DAYS_PER_YEAR`. */
    tradingDaysPerYear?: number
    /** Number of daily samples along the path, including day 0. Defaults to horizonDays + 1. */
    steps?: number
    /**
     * RNG seed reserved for optional sample paths. Closed-form percentiles
     * (p10 / p50 / p90) do not depend on it.
     */
    seed: number
}

/** One daily sample on the fan chart. Day 0 is today and equals `spot`. */
export interface ForecastPathPoint {
    /** Calendar date `YYYY-MM-DD`. */
    date: string
    /** 0 = as-of date, last index = horizon. */
    day: number
    p10: number
    p50: number
    p90: number
}

/** Median terminal price and return for one named scenario. */
export interface ForecastScenarioOutcome {
    id: ForecastScenarioId
    probability: number
    /** Median price at the horizon under this scenario's drift and the shared vol. */
    price: number
    /** `(price - spot) / spot` */
    returnPct: number
    thesis: string
}

/**
 * Snapshot at the horizon. `p50` is the GBM median; `expected` is the mean
 * `spot * exp(μ T)`, which sits above the median when vol is positive.
 */
export interface ForecastTerminal {
    date: string
    p10: number
    p50: number
    p90: number
    expected: number
    p10Return: number
    p50Return: number
    p90Return: number
    expectedReturn: number
    scenarios: ForecastScenarioOutcome[]
}

/* ------------------------------------------------------------------ */
/* API response                                                        */
/* ------------------------------------------------------------------ */

export type ForecastAssumptionSource = "llm" | "historical-fallback"

/** Market facts the forecast was anchored to. Never LLM-invented. */
export interface ForecastAnchors {
    spot: number
    currency: string
    realizedVolatility?: number
    beta?: number
    analystMeanTarget?: number
    dcfFairValue?: number
    sentimentScore?: number
}

export interface ForecastCommentary {
    /** Caption for the fan chart, written against the computed p10 / p50 / p90. */
    summary: string
    downside: string
    upside: string
}

export interface ForecastMeta {
    /** OpenRouter model id, or `"none"` when assumptions came from the fallback. */
    model: string
    engine: ForecastEngine
    seed: number
    generatedAt: string
    source: ForecastAssumptionSource
    cached: boolean
}

/**
 * Full payload for `GET /api/forecast/[ticker]`.
 *
 * `path` is the fan chart. `terminal` is the last point plus scenario cards.
 * `commentary` is optional until a second LLM pass (or a combined prompt)
 * fills it; the chart remains valid without it.
 */
export interface ForecastResult {
    ticker: string
    companyName?: string
    horizonDays: number
    /** ISO timestamp of the spot used for the simulation. */
    asOf: string
    anchors: ForecastAnchors
    assumptions: ForecastAssumptions
    path: ForecastPathPoint[]
    terminal: ForecastTerminal
    commentary?: ForecastCommentary
    meta: ForecastMeta
}

export interface ForecastErrorResponse {
    error: string
    ticker?: string
    code?: ForecastErrorCode
}

export type ForecastAssumptionErrorCode =
    | "invalid-drift"
    | "invalid-volatility"
    | "invalid-thesis"
    | "invalid-scenarios"
    | "probabilities-not-unit"
    | "missing-scenario"

export type ForecastErrorCode =
    | ForecastAssumptionErrorCode
    | "invalid-ticker"
    | "invalid-horizon"
    | "invalid-spot"
    | "insufficient-history"
