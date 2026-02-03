// Correlation Heatmap Types

export type Industry =
    | 'Semiconductors'
    | 'Software'
    | 'Hardware'
    | 'Internet'
    | 'Banks'
    | 'Insurance'
    | 'Asset Management'
    | 'Pharmaceuticals'
    | 'Biotech'
    | 'Medical Devices'
    | 'Oil & Gas'
    | 'Renewable Energy'
    | 'Electric Utilities'
    | 'Gas Utilities'
    | 'Retail'
    | 'Automotive'
    | 'Restaurants'
    | 'Food & Beverage'
    | 'Household Products'
    | 'Telecom'
    | 'Media'
    | 'Aerospace'
    | 'Construction'
    | 'REITs'
    | 'Mining'
    | 'Chemicals'
    | 'Other'

export type Sector =
    | 'Technology'
    | 'Financials'
    | 'Healthcare'
    | 'Energy'
    | 'Utilities'
    | 'Consumer Discretionary'
    | 'Consumer Staples'
    | 'Communication Services'
    | 'Industrials'
    | 'Real Estate'
    | 'Materials'

export interface CorrelationHolding {
    id: string
    ticker: string
    name?: string
    sector: Sector
    industry: Industry
    value?: number // portfolio weight
}

export interface CorrelationPair {
    tickerA: string
    tickerB: string
    correlation: number
    reason: 'same_industry' | 'same_sector' | 'cross_sector' | 'inverse'
}

export interface CorrelationMatrix {
    holdings: CorrelationHolding[]
    matrix: number[][] // NxN matrix of correlation coefficients
    pairs: CorrelationPair[] // Flattened list of all pairs
    highRiskPairs: CorrelationPair[] // Pairs with correlation > 0.85
}

export interface DiversificationTip {
    severity: 'warning' | 'critical'
    message: string
    tickers: string[]
    suggestion: string
}

// Sector to suggested inverse sectors mapping
export const INVERSE_SECTORS: Record<Sector, Sector[]> = {
    'Technology': ['Utilities', 'Consumer Staples', 'Healthcare'],
    'Financials': ['Utilities', 'Healthcare', 'Consumer Staples'],
    'Healthcare': ['Energy', 'Financials', 'Materials'],
    'Energy': ['Technology', 'Healthcare', 'Consumer Discretionary'],
    'Utilities': ['Technology', 'Consumer Discretionary', 'Financials'],
    'Consumer Discretionary': ['Utilities', 'Consumer Staples', 'Healthcare'],
    'Consumer Staples': ['Technology', 'Consumer Discretionary', 'Financials'],
    'Communication Services': ['Utilities', 'Consumer Staples', 'Materials'],
    'Industrials': ['Utilities', 'Consumer Staples', 'Healthcare'],
    'Real Estate': ['Technology', 'Energy', 'Materials'],
    'Materials': ['Technology', 'Healthcare', 'Consumer Discretionary'],
}

// Industry options grouped by sector
export const INDUSTRY_BY_SECTOR: Record<Sector, Industry[]> = {
    'Technology': ['Semiconductors', 'Software', 'Hardware', 'Internet'],
    'Financials': ['Banks', 'Insurance', 'Asset Management'],
    'Healthcare': ['Pharmaceuticals', 'Biotech', 'Medical Devices'],
    'Energy': ['Oil & Gas', 'Renewable Energy'],
    'Utilities': ['Electric Utilities', 'Gas Utilities'],
    'Consumer Discretionary': ['Retail', 'Automotive', 'Restaurants'],
    'Consumer Staples': ['Food & Beverage', 'Household Products'],
    'Communication Services': ['Telecom', 'Media'],
    'Industrials': ['Aerospace', 'Construction'],
    'Real Estate': ['REITs'],
    'Materials': ['Mining', 'Chemicals'],
}
