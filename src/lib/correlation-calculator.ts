import {
    Sector,
    Industry,
    CorrelationHolding,
    CorrelationMatrix,
    CorrelationPair,
    DiversificationTip,
    INVERSE_SECTORS,
} from '@/types/correlation'

/**
 * Proxy-based correlation values
 * Since fetching historical covariance is API-heavy, we use sector/industry mappings
 */
export const CORRELATION_PROXIES = {
    // Same industry = very high correlation
    SAME_INDUSTRY: 0.85,

    // Same sector, different industry = moderate-high correlation
    SAME_SECTOR: 0.65,

    // Different sector correlations (some sectors move together more than others)
    CROSS_SECTOR: {
        // Tech-adjacent sectors
        'Technology-Communication Services': 0.70,
        'Technology-Consumer Discretionary': 0.55,

        // Defensive sectors (tend to move together)
        'Utilities-Consumer Staples': 0.50,
        'Healthcare-Consumer Staples': 0.45,

        // Cyclical sectors
        'Financials-Real Estate': 0.60,
        'Industrials-Materials': 0.55,
        'Energy-Materials': 0.50,

        // Growth vs Value
        'Technology-Utilities': 0.15,
        'Technology-Energy': 0.20,

        // Default for unspecified pairs
        DEFAULT: 0.25,
    },

    // Special cases for inverse correlations
    INVERSE_PAIRS: {
        'Technology-Utilities': 0.10,
        'Consumer Discretionary-Consumer Staples': 0.30,
    },
}

/**
 * Get correlation coefficient between two sectors
 */
function getSectorCorrelation(sectorA: Sector, sectorB: Sector): number {
    // Same sector
    if (sectorA === sectorB) {
        return CORRELATION_PROXIES.SAME_SECTOR
    }

    // Check for specific cross-sector correlation
    const key1 = `${sectorA}-${sectorB}` as keyof typeof CORRELATION_PROXIES.CROSS_SECTOR
    const key2 = `${sectorB}-${sectorA}` as keyof typeof CORRELATION_PROXIES.CROSS_SECTOR

    if (CORRELATION_PROXIES.CROSS_SECTOR[key1]) {
        return CORRELATION_PROXIES.CROSS_SECTOR[key1]
    }
    if (CORRELATION_PROXIES.CROSS_SECTOR[key2]) {
        return CORRELATION_PROXIES.CROSS_SECTOR[key2]
    }

    return CORRELATION_PROXIES.CROSS_SECTOR.DEFAULT
}

/**
 * Calculate correlation between two holdings using proxy logic
 */
function calculatePairCorrelation(
    holdingA: CorrelationHolding,
    holdingB: CorrelationHolding
): { correlation: number; reason: CorrelationPair['reason'] } {
    // Same stock = perfect correlation
    if (holdingA.ticker === holdingB.ticker) {
        return { correlation: 1.0, reason: 'same_industry' }
    }

    // Same industry = very high correlation
    if (holdingA.industry === holdingB.industry) {
        // Add slight variation based on ticker to avoid all being exactly 0.85
        const variation = ((holdingA.ticker.charCodeAt(0) + holdingB.ticker.charCodeAt(0)) % 10) / 100
        return {
            correlation: Math.min(0.95, CORRELATION_PROXIES.SAME_INDUSTRY + variation),
            reason: 'same_industry'
        }
    }

    // Same sector, different industry
    if (holdingA.sector === holdingB.sector) {
        const variation = ((holdingA.ticker.charCodeAt(0) + holdingB.ticker.charCodeAt(0)) % 15) / 100
        return {
            correlation: CORRELATION_PROXIES.SAME_SECTOR + variation,
            reason: 'same_sector'
        }
    }

    // Check if sectors are inverse
    const inverseForA = INVERSE_SECTORS[holdingA.sector] || []
    if (inverseForA.includes(holdingB.sector)) {
        return {
            correlation: getSectorCorrelation(holdingA.sector, holdingB.sector),
            reason: 'inverse'
        }
    }

    // Cross-sector correlation
    return {
        correlation: getSectorCorrelation(holdingA.sector, holdingB.sector),
        reason: 'cross_sector'
    }
}

/**
 * Calculate the full NxN correlation matrix for a portfolio
 */
export function calculateCorrelationMatrix(
    holdings: CorrelationHolding[]
): CorrelationMatrix {
    const n = holdings.length

    // Initialize NxN matrix
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))
    const pairs: CorrelationPair[] = []
    const highRiskPairs: CorrelationPair[] = []

    // Calculate all pair correlations
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1.0 // Perfect correlation with self
            } else {
                const { correlation, reason } = calculatePairCorrelation(holdings[i], holdings[j])
                matrix[i][j] = correlation

                // Only add each pair once (upper triangle)
                if (i < j) {
                    const pair: CorrelationPair = {
                        tickerA: holdings[i].ticker,
                        tickerB: holdings[j].ticker,
                        correlation,
                        reason,
                    }
                    pairs.push(pair)

                    if (correlation >= 0.85) {
                        highRiskPairs.push(pair)
                    }
                }
            }
        }
    }

    // Sort high-risk pairs by correlation (highest first)
    highRiskPairs.sort((a, b) => b.correlation - a.correlation)

    return {
        holdings,
        matrix,
        pairs,
        highRiskPairs,
    }
}

/**
 * Generate diversification tips based on correlation analysis
 */
export function generateDiversificationTips(
    matrix: CorrelationMatrix
): DiversificationTip[] {
    const tips: DiversificationTip[] = []

    // Check for high-risk pairs
    if (matrix.highRiskPairs.length > 0) {
        // Group high-correlation tickers
        const highCorrTickers = new Set<string>()
        matrix.highRiskPairs.forEach(pair => {
            highCorrTickers.add(pair.tickerA)
            highCorrTickers.add(pair.tickerB)
        })

        const tickerList = Array.from(highCorrTickers)

        // Find dominant sector
        const sectorCounts = new Map<Sector, number>()
        matrix.holdings.forEach(h => {
            if (highCorrTickers.has(h.ticker)) {
                sectorCounts.set(h.sector, (sectorCounts.get(h.sector) || 0) + 1)
            }
        })

        let dominantSector: Sector = 'Technology'
        let maxCount = 0
        sectorCounts.forEach((count, sector) => {
            if (count > maxCount) {
                maxCount = count
                dominantSector = sector
            }
        })

        // Get inverse sector suggestions
        const inverseSectors = INVERSE_SECTORS[dominantSector] || ['Utilities', 'Consumer Staples']

        tips.push({
            severity: matrix.highRiskPairs.length >= 3 ? 'critical' : 'warning',
            message: `High correlation detected: Your holdings in ${tickerList.slice(0, 4).join(', ')}${tickerList.length > 4 ? '...' : ''} move almost identically. Diversification benefit is low.`,
            tickers: tickerList,
            suggestion: `Consider adding ${inverseSectors.slice(0, 2).join(' or ')} stocks to balance your ${dominantSector}-heavy exposure.`,
        })
    }

    // Check for sector concentration
    const sectorWeights = new Map<Sector, number>()
    matrix.holdings.forEach(h => {
        sectorWeights.set(h.sector, (sectorWeights.get(h.sector) || 0) + 1)
    })

    const totalHoldings = matrix.holdings.length
    sectorWeights.forEach((count, sector) => {
        const weight = count / totalHoldings
        if (weight >= 0.50 && tips.length < 3) {
            const inverseSectors = INVERSE_SECTORS[sector] || ['Utilities', 'Consumer Staples']
            tips.push({
                severity: weight >= 0.70 ? 'critical' : 'warning',
                message: `${(weight * 100).toFixed(0)}% of your portfolio is concentrated in ${sector}.`,
                tickers: matrix.holdings.filter(h => h.sector === sector).map(h => h.ticker),
                suggestion: `Consider diversifying into ${inverseSectors.slice(0, 2).join(' or ')} for better risk-adjusted returns.`,
            })
        }
    })

    return tips
}

/**
 * Get color for correlation value (for heatmap visualization)
 */
export function getCorrelationColor(value: number): string {
    // High correlation: Deep Red/Orange
    if (value >= 0.80) {
        const intensity = (value - 0.80) / 0.20 // 0-1 scale for 0.80-1.0 range
        return `rgba(239, 68, 68, ${0.6 + intensity * 0.4})` // red-500
    }

    // Moderate-high correlation: Orange/Yellow
    if (value >= 0.60) {
        return `rgba(249, 115, 22, ${0.4 + (value - 0.60) / 0.20 * 0.3})` // orange-500
    }

    // Neutral correlation: Gray
    if (value >= 0.30) {
        return `rgba(156, 163, 175, ${0.3 + (value - 0.30) / 0.30 * 0.2})` // gray-400
    }

    // Low/Inverse correlation: Blue/Cyan (good for diversification)
    return `rgba(34, 211, 238, ${0.4 + (0.30 - value) / 0.30 * 0.3})` // cyan-400
}

/**
 * Get text color that contrasts with correlation background
 */
export function getCorrelationTextColor(value: number): string {
    if (value >= 0.75 || value < 0.20) {
        return 'rgba(255, 255, 255, 0.9)'
    }
    return 'rgba(255, 255, 255, 0.7)'
}
