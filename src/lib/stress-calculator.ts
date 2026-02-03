import {
    StressScenario,
    PortfolioHolding,
    HoldingImpact,
    StressTestResult,
    Vulnerability,
    Sector,
} from '@/types/stress-test'
import { getSectorBeta } from './stress-scenarios'

/**
 * Calculate the stress impact on a portfolio for a given scenario
 */
export function calculateStressImpact(
    holdings: PortfolioHolding[],
    scenario: StressScenario
): StressTestResult {
    if (holdings.length === 0) {
        return {
            scenario,
            totalCurrentValue: 0,
            totalProjectedValue: 0,
            totalProjectedLoss: 0,
            totalProjectedLossPercent: 0,
            holdingBreakdown: [],
            vulnerabilities: [],
        }
    }

    const holdingBreakdown: HoldingImpact[] = holdings.map(holding => {
        const currentValue = holding.shares * holding.currentPrice

        // Get sector-adjusted multiplier
        const sectorMultiplier = holding.beta ?? getSectorBeta(holding.sector)

        // Apply sector-adjusted drawdown
        // e.g., -50% market * 1.3x tech beta = -65% for tech stock
        const adjustedDrawdown = scenario.marketDrawdown * sectorMultiplier

        // Calculate projected value after drawdown
        const projectedValue = currentValue * (1 + adjustedDrawdown)
        const projectedLoss = projectedValue - currentValue
        const projectedLossPercent = adjustedDrawdown

        return {
            holding,
            currentValue,
            projectedValue,
            projectedLoss,
            projectedLossPercent,
            sectorMultiplier,
        }
    })

    // Calculate totals
    const totalCurrentValue = holdingBreakdown.reduce((sum, h) => sum + h.currentValue, 0)
    const totalProjectedValue = holdingBreakdown.reduce((sum, h) => sum + h.projectedValue, 0)
    const totalProjectedLoss = totalProjectedValue - totalCurrentValue
    const totalProjectedLossPercent = totalCurrentValue > 0
        ? totalProjectedLoss / totalCurrentValue
        : 0

    // Identify vulnerabilities
    const vulnerabilities = identifyVulnerabilities(holdings, holdingBreakdown, totalCurrentValue)

    return {
        scenario,
        totalCurrentValue,
        totalProjectedValue,
        totalProjectedLoss,
        totalProjectedLossPercent,
        holdingBreakdown,
        vulnerabilities,
    }
}

/**
 * Analyze portfolio for risk vulnerabilities
 */
function identifyVulnerabilities(
    holdings: PortfolioHolding[],
    breakdown: HoldingImpact[],
    totalValue: number
): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = []

    if (totalValue === 0) return vulnerabilities

    // Check for single-stock concentration (>25% in one holding)
    breakdown.forEach(item => {
        const weight = item.currentValue / totalValue
        if (weight > 0.25) {
            vulnerabilities.push({
                type: 'concentration',
                severity: weight > 0.40 ? 'high' : 'medium',
                message: `${item.holding.ticker} represents ${(weight * 100).toFixed(0)}% of portfolio`,
                details: 'Single-stock concentration increases idiosyncratic risk.',
            })
        }
    })

    // Check for sector concentration
    const sectorWeights = new Map<Sector, number>()
    breakdown.forEach(item => {
        const current = sectorWeights.get(item.holding.sector) || 0
        sectorWeights.set(item.holding.sector, current + item.currentValue / totalValue)
    })

    sectorWeights.forEach((weight, sector) => {
        if (weight > 0.50) {
            vulnerabilities.push({
                type: 'sector_exposure',
                severity: weight > 0.70 ? 'high' : 'medium',
                message: `${(weight * 100).toFixed(0)}% exposure to ${sector}`,
                details: 'Heavy sector concentration amplifies drawdowns during sector-specific selloffs.',
            })
        }
    })

    // Check for high-beta concentration
    const highBetaWeight = breakdown
        .filter(item => item.sectorMultiplier >= 1.2)
        .reduce((sum, item) => sum + item.currentValue / totalValue, 0)

    if (highBetaWeight > 0.60) {
        vulnerabilities.push({
            type: 'high_beta',
            severity: highBetaWeight > 0.80 ? 'high' : 'medium',
            message: `${(highBetaWeight * 100).toFixed(0)}% in high-volatility sectors`,
            details: 'Portfolio will experience amplified losses during market downturns.',
        })
    }

    // Check for lack of defensive holdings
    const defensiveWeight = breakdown
        .filter(item => item.sectorMultiplier <= 0.9)
        .reduce((sum, item) => sum + item.currentValue / totalValue, 0)

    if (defensiveWeight < 0.15 && holdings.length >= 3) {
        vulnerabilities.push({
            type: 'sector_exposure',
            severity: 'low',
            message: 'Limited defensive sector allocation',
            details: 'Consider adding Utilities, Healthcare, or Consumer Staples for stability.',
        })
    }

    return vulnerabilities
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(value))

    return value < 0 ? `-${formatted}` : formatted
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
    const formatted = (Math.abs(value) * 100).toFixed(1)
    return value < 0 ? `-${formatted}%` : `+${formatted}%`
}
