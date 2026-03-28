import YahooFinance from "yahoo-finance2"
import { cacheGet, cacheSet, cachePruneIfNeeded } from "@/lib/server/memory-cache"
import { withRetry } from "@/lib/server/retry"

const yahooFinance = new YahooFinance()

const MODULES_FULL = [
    "price",
    "summaryDetail",
    "financialData",
    "defaultKeyStatistics",
    "recommendationTrend",
    "upgradeDowngradeHistory",
    "assetProfile",
    "earnings",
] as const

const MODULES_REDUCED = [
    "price",
    "summaryDetail",
    "financialData",
    "assetProfile",
] as const

const MODULES_MINIMAL = ["price"] as const

function cacheTtlMs(): number {
    const s = parseInt(process.env.YAHOO_CACHE_TTL_SECONDS || "45", 10)
    return Math.min(Math.max(s, 5), 120) * 1000
}

function isRetryableYahooError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    if (/429|rate|too many|ECONNRESET|ETIMEDOUT|socket|network/i.test(msg)) return true
    if (/5\d\d/.test(msg)) return true
    return true
}

async function quoteSummaryOnce(ticker: string, modules: readonly string[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await yahooFinance.quoteSummary(ticker, { modules: [...modules] } as any)) as Record<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any
    >
}

async function fetchQuoteSummaryRobust(ticker: string): Promise<{
    result: Record<string, unknown>
    partial: boolean
    warnings: string[]
}> {
    const warnings: string[] = []
    const upper = ticker.toUpperCase()

    try {
        const result = await withRetry(() => quoteSummaryOnce(upper, MODULES_FULL), {
            shouldRetry: isRetryableYahooError,
        })
        return { result, partial: false, warnings }
    } catch (e1) {
        console.warn("[yahoo] quoteSummary full failed", upper, e1)
        warnings.push("Full quote request failed; using a reduced module set.")
    }

    try {
        const result = await withRetry(() => quoteSummaryOnce(upper, MODULES_REDUCED), {
            shouldRetry: isRetryableYahooError,
        })
        return {
            result,
            partial: true,
            warnings: [...warnings, "Some datasets (e.g. earnings, analyst history) may be missing."],
        }
    } catch (e2) {
        console.warn("[yahoo] quoteSummary reduced failed", upper, e2)
        warnings.push("Reduced quote request failed; trying price only.")
    }

    const result = await withRetry(() => quoteSummaryOnce(upper, MODULES_MINIMAL), {
        shouldRetry: isRetryableYahooError,
    })
    return {
        result,
        partial: true,
        warnings: [...warnings, "Price-only quote: fundamentals and analyst data unavailable."],
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuarterly(q: any) {
    return {
        date: q.date || "",
        actual: q.actual?.raw ?? q.actual ?? null,
        estimate: q.estimate?.raw ?? q.estimate ?? null,
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOfficer(o: any) {
    return {
        name: o.name || "",
        title: o.title || "",
        age: o.age || undefined,
    }
}

export function mapYahooQuoteToStockPayload(
    ticker: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    partial: boolean,
    warnings: string[]
) {
    const price = result.price || {}
    const summaryDetail = result.summaryDetail || {}
    const financialData = result.financialData || {}
    const defaultKeyStatistics = result.defaultKeyStatistics || {}
    const recommendationTrend = result.recommendationTrend?.trend?.[0] || {}
    const upgradesDowngrades = result.upgradeDowngradeHistory?.history?.slice(0, 6) || []
    const assetProfile = result.assetProfile || {}
    const earnings = result.earnings || {}

    const quarterlyEarnings = (earnings.earningsChart?.quarterly || []).slice(-4).map(mapQuarterly)
    const companyOfficers = (assetProfile.companyOfficers || []).slice(0, 10).map(mapOfficer)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analystActions = upgradesDowngrades.map((action: any) => ({
        date: action.epochGradeDate,
        firm: action.firm,
        toGrade: action.toGrade,
        fromGrade: action.fromGrade,
        action: action.action,
    }))

    const stockData = {
        symbol: price.symbol || ticker,
        shortName: price.shortName || ticker,
        currency: price.currency,
        marketState: price.marketState ?? undefined,
        exchangeName: (price.fullExchangeName || price.exchangeName) ?? undefined,
        regularMarketPrice: price.regularMarketPrice,
        regularMarketChange: price.regularMarketChange,
        regularMarketChangePercent: price.regularMarketChangePercent,
        marketCap: price.marketCap,
        regularMarketOpen: price.regularMarketOpen,
        regularMarketDayHigh: price.regularMarketDayHigh,
        regularMarketDayLow: price.regularMarketDayLow,
        fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow,
        dividendRate: summaryDetail.dividendRate,
        dividendYield: summaryDetail.dividendYield,
        beta: summaryDetail.beta,
        trailingPE: summaryDetail.trailingPE,
        priceToBook: defaultKeyStatistics.priceToBook,
        debtToEquity: financialData.debtToEquity,
        returnOnEquity: financialData.returnOnEquity,
        currentRatio: financialData.currentRatio,
        consensus: {
            buy: recommendationTrend.buy || 0,
            strongBuy: recommendationTrend.strongBuy || 0,
            hold: recommendationTrend.hold || 0,
            sell: recommendationTrend.sell || 0,
            strongSell: recommendationTrend.strongSell || 0,
        },
        targets: {
            high: financialData.targetHighPrice,
            low: financialData.targetLowPrice,
            mean: financialData.targetMeanPrice,
            median: financialData.targetMedianPrice,
            current: financialData.currentPrice,
        },
        analystActions,
        longBusinessSummary: assetProfile.longBusinessSummary || undefined,
        sector: assetProfile.sector || undefined,
        industry: assetProfile.industry || undefined,
        website: assetProfile.website || undefined,
        city: assetProfile.city || undefined,
        country: assetProfile.country || undefined,
        fullTimeEmployees: assetProfile.fullTimeEmployees || undefined,
        companyOfficers,
        quarterlyEarnings,
        quotePartial: partial,
        quoteNotes: warnings.length ? warnings : undefined,
    }

    return stockData
}

export async function getStockQuotePayload(ticker: string) {
    const key = `v1:stock:${ticker.toUpperCase()}`
    cachePruneIfNeeded()
    const cached = cacheGet<ReturnType<typeof mapYahooQuoteToStockPayload>>(key)
    if (cached) return cached

    const { result, partial, warnings } = await fetchQuoteSummaryRobust(ticker)
    if (!result) {
        throw new Error("No data returned from Yahoo Finance")
    }

    const payload = mapYahooQuoteToStockPayload(ticker, result, partial, warnings)
    cacheSet(key, payload, cacheTtlMs())
    return payload
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOptionsContracts(result: any) {
    const quote = result.quote || {}
    return {
        underlyingSymbol: result.underlyingSymbol,
        expirationDates: (result.expirationDates || []).map((d: Date) =>
            d instanceof Date ? d.toISOString() : String(d)
        ),
        strikes: result.strikes || [],
        hasMiniOptions: result.hasMiniOptions || false,
        quote: {
            symbol: quote.symbol,
            shortName: quote.shortName || quote.longName,
            regularMarketPrice: quote.regularMarketPrice ?? 0,
            regularMarketChange: quote.regularMarketChange ?? 0,
            regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
            marketCap: quote.marketCap ?? undefined,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: (result.options || []).map((opt: any) => ({
            expirationDate:
                opt.expirationDate instanceof Date
                    ? opt.expirationDate.toISOString()
                    : String(opt.expirationDate),
            hasMiniOptions: opt.hasMiniOptions || false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            calls: (opt.calls || []).map((c: any) => ({
                contractSymbol: c.contractSymbol,
                strike: c.strike,
                currency: c.currency,
                lastPrice: c.lastPrice ?? 0,
                change: c.change ?? 0,
                percentChange: c.percentChange ?? 0,
                volume: c.volume ?? 0,
                openInterest: c.openInterest ?? 0,
                bid: c.bid ?? 0,
                ask: c.ask ?? 0,
                contractSize: c.contractSize || "REGULAR",
                expiration:
                    c.expiration instanceof Date ? c.expiration.toISOString() : String(c.expiration || ""),
                lastTradeDate:
                    c.lastTradeDate instanceof Date
                        ? c.lastTradeDate.toISOString()
                        : String(c.lastTradeDate || ""),
                impliedVolatility: c.impliedVolatility ?? 0,
                inTheMoney: c.inTheMoney ?? false,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            puts: (opt.puts || []).map((p: any) => ({
                contractSymbol: p.contractSymbol,
                strike: p.strike,
                currency: p.currency,
                lastPrice: p.lastPrice ?? 0,
                change: p.change ?? 0,
                percentChange: p.percentChange ?? 0,
                volume: p.volume ?? 0,
                openInterest: p.openInterest ?? 0,
                bid: p.bid ?? 0,
                ask: p.ask ?? 0,
                contractSize: p.contractSize || "REGULAR",
                expiration:
                    p.expiration instanceof Date ? p.expiration.toISOString() : String(p.expiration || ""),
                lastTradeDate:
                    p.lastTradeDate instanceof Date
                        ? p.lastTradeDate.toISOString()
                        : String(p.lastTradeDate || ""),
                impliedVolatility: p.impliedVolatility ?? 0,
                inTheMoney: p.inTheMoney ?? false,
            })),
        })),
    }
}

export async function getOptionsPayload(ticker: string, date: Date | null) {
    const dateKey = date ? date.toISOString().slice(0, 10) : "latest"
    const key = `v1:options:${ticker.toUpperCase()}:${dateKey}`
    cachePruneIfNeeded()
    type OptionsBody = {
        underlyingSymbol: string
        expirationDates: string[]
        strikes: number[]
        hasMiniOptions: boolean
        quote: {
            symbol: string
            shortName: string
            regularMarketPrice: number
            regularMarketChange: number
            regularMarketChangePercent: number
            marketCap?: number
        }
        options: ReturnType<typeof mapOptionsContracts>["options"]
    }

    const cached = cacheGet<OptionsBody>(key)
    if (cached) return cached

    const queryOptions: Record<string, unknown> = {}
    if (date) queryOptions.date = date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await withRetry(() => yahooFinance.options(ticker.toUpperCase(), queryOptions as any), {
        shouldRetry: isRetryableYahooError,
    })

    if (!result) {
        throw new Error("No options data returned from Yahoo Finance")
    }

    const mapped = mapOptionsContracts(result)
    const upper = ticker.toUpperCase()
    const q = mapped.quote
    const body: OptionsBody = {
        underlyingSymbol: mapped.underlyingSymbol || upper,
        expirationDates: mapped.expirationDates,
        strikes: mapped.strikes,
        hasMiniOptions: mapped.hasMiniOptions,
        quote: {
            symbol: q.symbol || upper,
            shortName: q.shortName || upper,
            regularMarketPrice: q.regularMarketPrice ?? 0,
            regularMarketChange: q.regularMarketChange ?? 0,
            regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
            marketCap: q.marketCap ?? undefined,
        },
        options: mapped.options,
    }

    cacheSet(key, body, cacheTtlMs())
    return body
}
