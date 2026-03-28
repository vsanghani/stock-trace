export interface StockData {
    symbol: string
    shortName: string
    currency: string
    /** Yahoo quote session (e.g. REGULAR, CLOSED, PRE, POST) */
    marketState?: string
    /** Primary listing name when available */
    exchangeName?: string
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
    // Analyst Data
    consensus?: {
        buy: number
        strongBuy: number
        hold: number
        sell: number
        strongSell: number
    }
    targets?: {
        high: number
        low: number
        mean: number
        median: number
        current: number
    }
    analystActions?: Array<{
        date: string
        firm: string
        toGrade: string
        fromGrade: string
        action: string
    }>
    // Company Profile
    longBusinessSummary?: string
    sector?: string
    industry?: string
    website?: string
    city?: string
    country?: string
    fullTimeEmployees?: number
    // Company Officers
    companyOfficers?: Array<{
        name: string
        title: string
        age?: number
    }>
    // Quarterly Earnings
    quarterlyEarnings?: Array<{
        date: string
        actual: number | null
        estimate: number | null
        revenue?: number | null
        period?: string
    }>
}
