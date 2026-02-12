// Stress Test Types

export interface StressScenario {
    id: string
    name: string
    description: string
    marketDrawdown: number // as decimal, e.g., -0.50 for -50%
    dateRange: {
        start: string
        end: string
    }
    isHypothetical: boolean
}

export type Sector =
    | 'Technology'
    | 'Healthcare'
    | 'Financials'
    | 'Consumer Discretionary'
    | 'Consumer Staples'
    | 'Energy'
    | 'Utilities'
    | 'Real Estate'
    | 'Materials'
    | 'Industrials'
    | 'Communication Services'

export interface PortfolioHolding {
    id: string
    ticker: string
    shares: number
    currentPrice: number
    sector: Sector
    beta?: number // individual stock beta (optional, defaults to sector beta)
}

export interface HoldingImpact {
    holding: PortfolioHolding
    currentValue: number
    projectedValue: number
    projectedLoss: number
    projectedLossPercent: number
    sectorMultiplier: number
}

export interface StressTestResult {
    scenario: StressScenario
    totalCurrentValue: number
    totalProjectedValue: number
    totalProjectedLoss: number
    totalProjectedLossPercent: number
    holdingBreakdown: HoldingImpact[]
    vulnerabilities: Vulnerability[]
}

export interface Vulnerability {
    type: 'concentration' | 'high_beta' | 'sector_exposure' | 'leverage'
    severity: 'low' | 'medium' | 'high'
    message: string
    details?: string
}

// Sector labels for display
export const SECTOR_OPTIONS: Sector[] = [
    'Technology',
    'Healthcare',
    'Financials',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Utilities',
    'Real Estate',
    'Materials',
    'Industrials',
    'Communication Services',
]
