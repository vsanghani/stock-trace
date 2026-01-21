export interface StockData {
    symbol: string
    shortName: string
    currency: string
    regularMarketPrice: number
    regularMarketChange: number
    regularMarketChangePercent: number
    marketCap: number
    regularMarketOpen: number
    regularMarketDayHigh: number
    regularMarketDayLow: number
    fiftyTwoWeekHigh: number
    fiftyTwoWeekLow: number
    dividendRate?: number
    dividendYield?: number
    beta?: number
    // Ratios
    trailingPE?: number
    priceToBook?: number
    debtToEquity?: number
    returnOnEquity?: number
    currentRatio?: number
}
