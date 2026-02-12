import {
    WhisperAlert,
    ConditionConfig,
    MarketDataSnapshot,
    EvaluationResult,
    ConditionOperator,
    METRIC_LABELS,
    OPERATOR_LABELS,
} from '@/types/whisper-alert'

/**
 * Evaluate a single operator condition
 */
function evaluateOperator(
    actualValue: number,
    operator: ConditionOperator,
    targetValue: number,
    targetValueSecondary?: number
): boolean {
    switch (operator) {
        case 'greater_than':
            return actualValue > targetValue
        case 'less_than':
            return actualValue < targetValue
        case 'equals':
            return Math.abs(actualValue - targetValue) < 0.01 // Allow small tolerance
        case 'greater_equal':
            return actualValue >= targetValue
        case 'less_equal':
            return actualValue <= targetValue
        case 'between':
            if (targetValueSecondary === undefined) return false
            return actualValue >= targetValue && actualValue <= targetValueSecondary
        default:
            return false
    }
}

/**
 * Get the actual metric value from market data
 */
function getMetricValue(
    data: MarketDataSnapshot,
    metric: ConditionConfig['metric']
): number | null {
    switch (metric) {
        case 'price_change_pct':
            return data.priceChangePct
        case 'price_absolute':
            return data.price
        case 'volume_ratio':
            return data.avgVolume30d > 0 ? data.volume / data.avgVolume30d : 0
        case '52w_high_low':
            // Returns how close to 52w high (1.0 = at high, 0.0 = at low)
            const range = data.high52w - data.low52w
            return range > 0 ? (data.price - data.low52w) / range : 0.5
        case 'rsi':
            return data.rsi ?? null
        case 'moving_average_cross':
            // Returns price / MA50 ratio (>1 means above MA)
            return data.ma50 && data.ma50 > 0 ? data.price / data.ma50 : null
        default:
            return null
    }
}

/**
 * Evaluate a single condition against market data
 */
function evaluateCondition(
    condition: ConditionConfig,
    marketData: Map<string, MarketDataSnapshot>
): { met: boolean; actualValue: number; description: string } {
    const tickerData = marketData.get(condition.ticker.toUpperCase())

    if (!tickerData) {
        return {
            met: false,
            actualValue: 0,
            description: `No data available for ${condition.ticker}`,
        }
    }

    const actualValue = getMetricValue(tickerData, condition.metric)

    if (actualValue === null) {
        return {
            met: false,
            actualValue: 0,
            description: `Metric ${condition.metric} not available for ${condition.ticker}`,
        }
    }

    let met = false
    let description = ''

    // Simple comparison to static value
    if (condition.comparisonType === 'static_value') {
        met = evaluateOperator(
            actualValue,
            condition.operator,
            condition.value,
            condition.valueSecondary
        )

        description = `${condition.ticker} ${METRIC_LABELS[condition.metric]} ${OPERATOR_LABELS[condition.operator]} ${condition.value}${condition.metric === 'price_change_pct' ? '%' : ''}`
    }

    // Relative comparison to another ticker/index
    else if (condition.comparisonType === 'ticker' || condition.comparisonType === 'index') {
        const comparisonTicker = condition.comparisonTicker?.toUpperCase()

        if (!comparisonTicker) {
            return {
                met: false,
                actualValue,
                description: 'No comparison ticker specified',
            }
        }

        const comparisonData = marketData.get(comparisonTicker)

        if (!comparisonData) {
            return {
                met: false,
                actualValue,
                description: `No data available for ${comparisonTicker}`,
            }
        }

        const comparisonValue = getMetricValue(
            comparisonData,
            condition.comparisonMetric || condition.metric
        )

        if (comparisonValue === null) {
            return {
                met: false,
                actualValue,
                description: `Metric not available for ${comparisonTicker}`,
            }
        }

        // Check if primary condition is met
        const primaryMet = evaluateOperator(
            actualValue,
            condition.operator,
            condition.value,
            condition.valueSecondary
        )

        // Check if comparison condition threshold is met (e.g., "while SPY is flat")
        const comparisonMet = condition.comparisonThreshold !== undefined
            ? Math.abs(comparisonValue) <= condition.comparisonThreshold
            : true

        met = primaryMet && comparisonMet

        description = `${condition.ticker} moves ${actualValue >= 0 ? '+' : ''}${actualValue.toFixed(2)}% while ${comparisonTicker} ${comparisonValue >= 0 ? '+' : ''}${comparisonValue.toFixed(2)}%`
    }

    return { met, actualValue, description }
}

/**
 * Evaluate a complete Whisper Alert against current market data
 */
export function evaluateWhisperAlert(
    alert: WhisperAlert,
    marketData: Map<string, MarketDataSnapshot>
): EvaluationResult {
    const conditionResults = alert.conditions.map(condition => {
        const result = evaluateCondition(condition, marketData)
        return {
            conditionId: condition.id,
            met: result.met,
            actualValue: result.actualValue,
            expectedValue: condition.value,
            description: result.description,
        }
    })

    // Combine conditions with logical operator
    let triggered: boolean
    if (alert.logicalOperator === 'AND') {
        triggered = conditionResults.every(r => r.met)
    } else {
        triggered = conditionResults.some(r => r.met)
    }

    // Check if notifyOnce and already triggered
    if (alert.notifyOnce && alert.triggered) {
        triggered = false
    }

    // Generate summary
    const metConditions = conditionResults.filter(r => r.met)
    let summary = ''

    if (triggered) {
        if (metConditions.length === 1) {
            summary = `🔔 Condition Met: ${metConditions[0].description}`
        } else {
            summary = `🔔 ${metConditions.length} Conditions Met: ${alert.name}`
        }
    } else {
        const unmetCount = conditionResults.length - metConditions.length
        summary = `Waiting: ${unmetCount} condition${unmetCount !== 1 ? 's' : ''} not yet met`
    }

    return {
        alertId: alert.id,
        triggered,
        conditionResults,
        summary,
    }
}

/**
 * Generate human-readable alert sentence
 */
export function generateAlertSentence(alert: WhisperAlert): string {
    if (alert.conditions.length === 0) {
        return 'No conditions set'
    }

    const parts = alert.conditions.map((condition, i) => {
        let sentence = `${condition.ticker} ${METRIC_LABELS[condition.metric]} ${OPERATOR_LABELS[condition.operator]} ${condition.value}${condition.metric === 'price_change_pct' ? '%' : ''}`

        if (condition.comparisonType !== 'static_value' && condition.comparisonTicker) {
            sentence += ` (while ${condition.comparisonTicker} ${condition.comparisonMetric ? METRIC_LABELS[condition.comparisonMetric] : ''} is within ${condition.comparisonThreshold || 0}%)`
        }

        return sentence
    })

    const connector = ` ${alert.logicalOperator} `
    return `IF ${parts.join(connector)}`
}

/**
 * Create mock market data for testing
 */
export function createMockMarketData(
    tickers: string[]
): Map<string, MarketDataSnapshot> {
    const data = new Map<string, MarketDataSnapshot>()

    tickers.forEach(ticker => {
        const basePrice = 100 + Math.random() * 400
        const changePct = (Math.random() - 0.5) * 10 // -5% to +5%

        data.set(ticker.toUpperCase(), {
            ticker: ticker.toUpperCase(),
            price: basePrice,
            priceChange: basePrice * (changePct / 100),
            priceChangePct: changePct,
            volume: Math.floor(Math.random() * 10000000),
            avgVolume30d: Math.floor(Math.random() * 5000000),
            high52w: basePrice * (1 + Math.random() * 0.5),
            low52w: basePrice * (1 - Math.random() * 0.3),
            rsi: 30 + Math.random() * 40,
            ma50: basePrice * (0.9 + Math.random() * 0.2),
            ma200: basePrice * (0.85 + Math.random() * 0.3),
        })
    })

    // Add common indices
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM']
    indices.forEach(index => {
        if (!data.has(index)) {
            const basePrice = 300 + Math.random() * 200
            const changePct = (Math.random() - 0.5) * 4 // -2% to +2%

            data.set(index, {
                ticker: index,
                price: basePrice,
                priceChange: basePrice * (changePct / 100),
                priceChangePct: changePct,
                volume: Math.floor(Math.random() * 50000000),
                avgVolume30d: Math.floor(Math.random() * 30000000),
                high52w: basePrice * 1.2,
                low52w: basePrice * 0.8,
                rsi: 45 + Math.random() * 20,
                ma50: basePrice * 0.98,
                ma200: basePrice * 0.95,
            })
        }
    })

    return data
}
