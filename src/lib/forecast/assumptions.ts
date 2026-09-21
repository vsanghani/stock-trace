/**
 * OpenRouter assumption layer for the price-path forecast.
 *
 * The model is only allowed to return `ForecastLlmJson` (drift, vol, thesis,
 * scenarios). Prices and paths are produced later by the local GBM engine.
 *
 * Server-side only: the OpenRouter key must never reach the client. When the
 * key is missing, or the completion cannot be parsed, we fall back to a
 * deterministic historical-vol mock so the rest of the pipeline still runs.
 */

import {
    FORECAST_LLM_JSON_EXAMPLE,
    type ForecastAssumptionSource,
    type ForecastAssumptions,
    type ForecastLlmContext,
    type ForecastLlmJson,
    type ForecastScenario,
    type ForecastScenarioId,
} from "@/types/forecast"
import { SITE_NAME, siteUrl } from "@/lib/site"
import { validateForecastAssumptions } from "@/lib/finance"

/** Same model senLogic uses; swap this constant to pick up a newer OpenRouter id. */
export const FORECAST_LLM_MODEL = "google/gemini-2.0-flash-001"

export const FORECAST_LLM_MODEL_NONE = "none"

/** Used when the context has no usable realized volatility. */
export const DEFAULT_FALLBACK_VOLATILITY = 0.25

const RATE_DECIMALS = 1e6
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export interface ForecastAssumptionFetchResult {
    assumptions: ForecastAssumptions
    source: ForecastAssumptionSource
    model: string
}

export interface FetchForecastAssumptionsOptions {
    /**
     * When omitted, reads `process.env.OPENROUTER_API_KEY`. Pass `null` or `""`
     * in tests to force the mock path without touching the real env.
     */
    apiKey?: string | null
    fetchImpl?: typeof fetch
    model?: string
}

function roundRate(rate: number): number {
    return Math.round(rate * RATE_DECIMALS) / RATE_DECIMALS
}

function asFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
    }
    return null
}

/**
 * LLMs often emit 28 for 28%. Values with |x| > 2 cannot be a decimal rate we
 * would ever send to GBM, so treat them as percentages.
 */
function maybePercent(value: number): number {
    return Math.abs(value) > 2 ? value / 100 : value
}

/** 25, 50, 25 → 0.25, 0.50, 0.25. Leaves already-decimal masses alone. */
function maybeProbability(value: number): number {
    return value > 1 && value <= 100 ? value / 100 : value
}

function extractJsonObject(content: string): unknown | null {
    const trimmed = content.trim()
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const body = (fenced ? fenced[1] : trimmed).trim()
    const start = body.indexOf("{")
    const end = body.lastIndexOf("}")
    if (start < 0 || end <= start) return null

    try {
        return JSON.parse(body.slice(start, end + 1)) as unknown
    } catch {
        return null
    }
}

function coerceScenario(raw: unknown): ForecastScenario | null {
    if (!raw || typeof raw !== "object") return null
    const row = raw as Record<string, unknown>
    const id = row.id
    if (id !== "bear" && id !== "base" && id !== "bull") return null

    const probability = asFiniteNumber(row.probability)
    const drift = asFiniteNumber(row.drift)
    if (probability === null || drift === null) return null
    if (typeof row.thesis !== "string") return null

    return {
        id: id as ForecastScenarioId,
        probability: maybeProbability(probability),
        drift: maybePercent(drift),
        thesis: row.thesis.trim(),
    }
}

/**
 * Parse a model completion into the forecast JSON contract.
 * Returns `null` when the payload is missing, malformed, or fails validation.
 */
export function parseForecastLlmJson(content: string): ForecastAssumptions | null {
    const parsed = extractJsonObject(content)
    if (!parsed || typeof parsed !== "object") return null

    const raw = parsed as Record<string, unknown>
    const scenariosRaw = Array.isArray(raw.scenarios) ? raw.scenarios : []
    const scenarios = scenariosRaw
        .map(coerceScenario)
        .filter((scenario): scenario is ForecastScenario => scenario !== null)

    const baseDrift = scenarios.find((scenario) => scenario.id === "base")?.drift ?? null
    const driftRaw = asFiniteNumber(raw.drift)
    const volatilityRaw = asFiniteNumber(raw.volatility)
    if (volatilityRaw === null || typeof raw.thesis !== "string") return null

    const drift = maybePercent(driftRaw ?? baseDrift ?? NaN)
    if (!Number.isFinite(drift)) return null

    const assumptions: ForecastLlmJson = {
        drift: roundRate(drift),
        volatility: roundRate(maybePercent(volatilityRaw)),
        thesis: raw.thesis.trim(),
        scenarios: scenarios.map((scenario) => ({
            ...scenario,
            drift: roundRate(scenario.drift),
            probability: roundRate(scenario.probability),
        })),
    }

    if (validateForecastAssumptions(assumptions).length > 0) return null
    return assumptions
}

function formatOptional(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return "n/a"
    return String(value)
}

/** System + user prompts. Exported so tests can lock the contract the model sees. */
export function buildForecastPrompts(context: ForecastLlmContext): {
    system: string
    user: string
} {
    const headlines =
        context.recentHeadlines.length > 0
            ? context.recentHeadlines.map((line) => `- ${line}`).join("\n")
            : "- none"

    const system = [
        "You are a research analyst setting assumptions for a geometric Brownian motion price-path model.",
        "Return ONLY a single JSON object. No markdown, no commentary, no dollar prices, no price path.",
        "Rates are decimals: 0.25 means 25%. Do not emit percentages or predicted closes.",
        "drift is the annualised expected return μ for the median path.",
        "volatility is annualised σ and must stay close to realizedVolatility from the context when that value is not n/a.",
        "scenarios must include bear, base, and bull exactly once. Their probabilities are decimals that sum to 1.",
        "Each thesis is one or two sentences.",
        "Match this shape exactly:",
        JSON.stringify(FORECAST_LLM_JSON_EXAMPLE, null, 2),
    ].join("\n")

    const user = [
        `Context for ${context.ticker} (${context.companyName}):`,
        `- spot: ${context.spot} ${context.currency}`,
        `- horizonDays: ${context.horizonDays}`,
        `- realizedVolatility: ${formatOptional(context.realizedVolatility)}`,
        `- beta: ${formatOptional(context.beta)}`,
        `- analystMeanTarget: ${formatOptional(context.analystMeanTarget)}`,
        `- dcfFairValue: ${formatOptional(context.dcfFairValue)}`,
        `- sentimentScore: ${formatOptional(context.sentimentScore)}`,
        `- sentimentReason: ${context.sentimentReason ?? "n/a"}`,
        "recentHeadlines:",
        headlines,
    ].join("\n")

    return { system, user }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function driftFromTarget(spot: number, target: number | null): number | null {
    if (!(spot > 0) || target === null || !(target > 0)) return null
    return clamp((target / spot) - 1, -0.8, 0.8)
}

/**
 * Deterministic mock used when OpenRouter is unavailable.
 * Volatility comes from realized vol (or 25%). Drift comes from the 12-month
 * analyst target when we have one, otherwise zero. Scenario drifts sit one
 * sigma either side of that base. The theses state that no LLM view was used.
 */
export function buildFallbackAssumptions(context: ForecastLlmContext): ForecastAssumptions {
    const volatility =
        context.realizedVolatility !== null && context.realizedVolatility > 0
            ? context.realizedVolatility
            : DEFAULT_FALLBACK_VOLATILITY
    const drift = driftFromTarget(context.spot, context.analystMeanTarget) ?? 0
    const ticker = context.ticker

    return {
        drift: roundRate(drift),
        volatility: roundRate(volatility),
        thesis: `Fallback assumptions for ${ticker}: realized volatility with no LLM view.`,
        scenarios: [
            {
                id: "bear",
                probability: 0.25,
                drift: roundRate(drift - volatility),
                thesis: `Downside of about one year of volatility below the base drift for ${ticker}.`,
            },
            {
                id: "base",
                probability: 0.5,
                drift: roundRate(drift),
                thesis: `Base case holds the implied drift from available market anchors for ${ticker}.`,
            },
            {
                id: "bull",
                probability: 0.25,
                drift: roundRate(drift + volatility),
                thesis: `Upside of about one year of volatility above the base drift for ${ticker}.`,
            },
        ],
    }
}

function fallbackResult(context: ForecastLlmContext): ForecastAssumptionFetchResult {
    return {
        assumptions: buildFallbackAssumptions(context),
        source: "historical-fallback",
        model: FORECAST_LLM_MODEL_NONE,
    }
}

async function completeWithOpenRouter(
    context: ForecastLlmContext,
    apiKey: string,
    model: string,
    fetchImpl: typeof fetch
): Promise<string> {
    const { system, user } = buildForecastPrompts(context)
    const response = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": siteUrl().toString(),
            "X-Title": `${SITE_NAME} Forecast`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            max_tokens: 700,
            temperature: 0.2,
        }),
    })

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error("OpenRouter returned an empty completion")
    return content
}

/**
 * Fetch GBM assumptions from OpenRouter, or the historical-vol mock when the
 * key is missing or the completion cannot be used.
 */
export async function fetchForecastAssumptions(
    context: ForecastLlmContext,
    options: FetchForecastAssumptionsOptions = {}
): Promise<ForecastAssumptionFetchResult> {
    const apiKey = options.apiKey === undefined ? process.env.OPENROUTER_API_KEY : options.apiKey
    const model = options.model ?? FORECAST_LLM_MODEL
    const fetchImpl = options.fetchImpl ?? fetch

    if (!apiKey) return fallbackResult(context)

    try {
        const content = await completeWithOpenRouter(context, apiKey, model, fetchImpl)
        const assumptions = parseForecastLlmJson(content)
        if (!assumptions) throw new Error("Invalid LLM response format")
        return { assumptions, source: "llm", model }
    } catch (error) {
        console.error("Forecast assumption error:", error)
        return fallbackResult(context)
    }
}
