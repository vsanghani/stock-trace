/**
 * Company fundamentals for the valuation analyzer.
 *
 * Yahoo Finance is the default provider because it needs no API key and already
 * backs the rest of Stock Trace. Setting `FMP_API_KEY` in `.env.local` switches
 * to Financial Modeling Prep, with Yahoo kept as a fallback. If every live
 * provider fails, frozen mock snapshots keep the page usable.
 *
 * This module is server-only; it is imported by the route handler, never by a
 * client component.
 */

import YahooFinance from "yahoo-finance2"

import { historicalGrowthRate } from "@/lib/finance"
import type { FinancialYear, ValuationSnapshot } from "@/types/valuation"

import { getMockSnapshot } from "./mockCompanies"

export const CACHE_TTL_SECONDS = 3600

const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000

/** Number of fiscal years to pull for the growth benchmarks. */
const HISTORY_YEARS = 4

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] })

/**
 * Process-level cache. Next's fetch cache does not cover the Yahoo client,
 * which uses its own transport, so this is what actually protects rate limits.
 */
const snapshotCache = new Map<string, { snapshot: ValuationSnapshot; expiresAt: number }>()

/* ------------------------------------------------------------------ */
/* Yahoo Finance                                                       */
/* ------------------------------------------------------------------ */

interface YahooQuoteSummary {
    price?: {
        symbol?: string
        shortName?: string
        longName?: string
        currency?: string
        regularMarketPrice?: number
        marketCap?: number
    }
    financialData?: {
        freeCashflow?: number
        totalCash?: number
        totalDebt?: number
    }
    defaultKeyStatistics?: {
        sharesOutstanding?: number
    }
}

interface YahooFundamentalRow {
    date?: Date | string | number
    freeCashFlow?: number
    totalRevenue?: number
}

function toIsoDate(value: Date | string | number | undefined): string | null {
    if (value === undefined) return null
    const date =
        value instanceof Date
            ? value
            : typeof value === "number"
              ? new Date(value * 1000)
              : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function seriesFrom(
    rows: YahooFundamentalRow[],
    field: "freeCashFlow" | "totalRevenue"
): FinancialYear[] {
    return rows
        .map((row) => {
            const date = toIsoDate(row.date)
            const value = row[field]
            return date !== null && typeof value === "number" ? { date, value } : null
        })
        .filter((entry): entry is FinancialYear => entry !== null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-HISTORY_YEARS)
}

/**
 * Yahoo's `fundamentalsTimeSeries` returns fields outside the library's schema
 * for several large caps, so validation is disabled; without it NVDA and MSFT
 * throw instead of returning their history.
 */
async function fetchYahooHistory(ticker: string): Promise<YahooFundamentalRow[]> {
    const now = new Date()
    const start = new Date(now.getFullYear() - (HISTORY_YEARS + 2), 0, 1)

    try {
        const rows = await yahooFinance.fundamentalsTimeSeries(
            ticker,
            { period1: start, period2: now, type: "annual", module: "all" },
            { validateResult: false }
        )
        return rows as unknown as YahooFundamentalRow[]
    } catch {
        return []
    }
}

async function fetchFromYahoo(ticker: string): Promise<ValuationSnapshot> {
    const [summaryRaw, history] = await Promise.all([
        yahooFinance.quoteSummary(ticker, {
            modules: ["price", "financialData", "defaultKeyStatistics"],
        }),
        fetchYahooHistory(ticker),
    ])

    const summary = summaryRaw as unknown as YahooQuoteSummary
    const price = summary.price ?? {}
    const financials = summary.financialData ?? {}
    const keyStats = summary.defaultKeyStatistics ?? {}

    const currentPrice = price.regularMarketPrice
    const sharesOutstanding = keyStats.sharesOutstanding
    if (!currentPrice || !sharesOutstanding) {
        throw new Error(`Yahoo returned no price or share count for ${ticker}`)
    }

    const freeCashFlowHistory = seriesFrom(history, "freeCashFlow")
    const revenueHistory = seriesFrom(history, "totalRevenue")

    // The latest fiscal year is steadier than the trailing figure, which swings
    // hard for companies in a heavy capital expenditure cycle.
    const latestAnnual = freeCashFlowHistory[freeCashFlowHistory.length - 1]?.value
    const freeCashFlow = latestAnnual ?? financials.freeCashflow
    if (freeCashFlow === undefined) {
        throw new Error(`Yahoo returned no free cash flow for ${ticker}`)
    }

    const totalDebt = financials.totalDebt ?? 0
    const totalCash = financials.totalCash ?? 0

    return {
        ticker: (price.symbol ?? ticker).toUpperCase(),
        companyName: price.shortName ?? price.longName ?? ticker.toUpperCase(),
        currency: price.currency ?? "USD",
        currentPrice,
        marketCap: price.marketCap,
        freeCashFlow,
        freeCashFlowBasis: latestAnnual !== undefined ? "annual" : "ttm",
        sharesOutstanding,
        netDebt: totalDebt - totalCash,
        totalDebt,
        totalCash,
        freeCashFlowHistory,
        revenueHistory,
        freeCashFlowGrowth: historicalGrowthRate(freeCashFlowHistory.map((y) => y.value)),
        revenueGrowth: historicalGrowthRate(revenueHistory.map((y) => y.value)),
        source: "yahoo",
        fetchedAt: new Date().toISOString(),
    }
}

/* ------------------------------------------------------------------ */
/* Financial Modeling Prep                                             */
/* ------------------------------------------------------------------ */

interface FmpProfile {
    companyName?: string
    price?: number
    currency?: string
    mktCap?: number
}

interface FmpCashFlow {
    date?: string
    freeCashFlow?: number
}

interface FmpBalanceSheet {
    totalDebt?: number
    cashAndShortTermInvestments?: number
}

interface FmpIncome {
    date?: string
    revenue?: number
    weightedAverageShsOut?: number
}

async function fmpGet<T>(path: string, apiKey: string): Promise<T[]> {
    const separator = path.includes("?") ? "&" : "?"
    const url = `https://financialmodelingprep.com/api/v3/${path}${separator}apikey=${apiKey}`

    const response = await fetch(url, { next: { revalidate: CACHE_TTL_SECONDS } })
    if (!response.ok) {
        throw new Error(`Financial Modeling Prep responded ${response.status} for ${path}`)
    }

    const payload: unknown = await response.json()
    return Array.isArray(payload) ? (payload as T[]) : []
}

async function fetchFromFmp(ticker: string, apiKey: string): Promise<ValuationSnapshot> {
    const [profiles, cashFlows, balanceSheets, incomes] = await Promise.all([
        fmpGet<FmpProfile>(`profile/${ticker}`, apiKey),
        fmpGet<FmpCashFlow>(`cash-flow-statement/${ticker}?limit=${HISTORY_YEARS}`, apiKey),
        fmpGet<FmpBalanceSheet>(`balance-sheet-statement/${ticker}?limit=1`, apiKey),
        fmpGet<FmpIncome>(`income-statement/${ticker}?limit=${HISTORY_YEARS}`, apiKey),
    ])

    const profile = profiles[0]
    const balanceSheet = balanceSheets[0]
    const currentPrice = profile?.price
    const sharesOutstanding = incomes[0]?.weightedAverageShsOut

    if (!currentPrice || !sharesOutstanding) {
        throw new Error(`Financial Modeling Prep returned no price or share count for ${ticker}`)
    }

    // FMP returns statements newest first; the rest of the app expects oldest first.
    const freeCashFlowHistory: FinancialYear[] = cashFlows
        .filter((row): row is Required<FmpCashFlow> => !!row.date && row.freeCashFlow !== undefined)
        .map((row) => ({ date: row.date.slice(0, 10), value: row.freeCashFlow }))
        .sort((a, b) => a.date.localeCompare(b.date))

    const revenueHistory: FinancialYear[] = incomes
        .filter((row): row is FmpIncome & { date: string; revenue: number } => {
            return !!row.date && row.revenue !== undefined
        })
        .map((row) => ({ date: row.date.slice(0, 10), value: row.revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))

    const freeCashFlow = freeCashFlowHistory[freeCashFlowHistory.length - 1]?.value
    if (freeCashFlow === undefined) {
        throw new Error(`Financial Modeling Prep returned no free cash flow for ${ticker}`)
    }

    const totalDebt = balanceSheet?.totalDebt ?? 0
    const totalCash = balanceSheet?.cashAndShortTermInvestments ?? 0

    return {
        ticker: ticker.toUpperCase(),
        companyName: profile?.companyName ?? ticker.toUpperCase(),
        currency: profile?.currency ?? "USD",
        currentPrice,
        marketCap: profile?.mktCap,
        freeCashFlow,
        freeCashFlowBasis: "annual",
        sharesOutstanding,
        netDebt: totalDebt - totalCash,
        totalDebt,
        totalCash,
        freeCashFlowHistory,
        revenueHistory,
        freeCashFlowGrowth: historicalGrowthRate(freeCashFlowHistory.map((y) => y.value)),
        revenueGrowth: historicalGrowthRate(revenueHistory.map((y) => y.value)),
        source: "fmp",
        fetchedAt: new Date().toISOString(),
    }
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

function providerChain(ticker: string): Array<() => Promise<ValuationSnapshot>> {
    const apiKey = process.env.FMP_API_KEY?.trim()
    const yahoo = () => fetchFromYahoo(ticker)

    return apiKey ? [() => fetchFromFmp(ticker, apiKey), yahoo] : [yahoo]
}

/**
 * Fetch a company snapshot, trying each configured provider in turn and falling
 * back to a frozen mock. Throws only when nothing at all can be resolved.
 */
export async function fetchValuationSnapshot(rawTicker: string): Promise<ValuationSnapshot> {
    const ticker = rawTicker.trim().toUpperCase()
    if (!ticker) throw new Error("A ticker symbol is required")

    const cached = snapshotCache.get(ticker)
    if (cached && cached.expiresAt > Date.now()) return cached.snapshot

    for (const attempt of providerChain(ticker)) {
        try {
            const snapshot = await attempt()
            snapshotCache.set(ticker, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS })
            return snapshot
        } catch (error) {
            console.error(`Valuation provider failed for ${ticker}:`, error)
        }
    }

    const mock = getMockSnapshot(ticker)
    if (mock) return mock

    throw new Error(`No valuation data available for ${ticker}`)
}

/** Exposed for tests and for clearing state between requests in development. */
export function clearValuationCache(): void {
    snapshotCache.clear()
}
