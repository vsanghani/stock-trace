// Whisper Alerts Types

export type ConditionOperator =
    | 'greater_than'      // >
    | 'less_than'         // <
    | 'equals'            // ==
    | 'greater_equal'     // >=
    | 'less_equal'        // <=
    | 'between'           // range

export type LogicalOperator = 'AND' | 'OR'

export type MetricType =
    | 'price_change_pct'      // Price % change
    | 'price_absolute'        // Absolute price
    | 'volume_ratio'          // Volume vs X-day average
    | '52w_high_low'          // Proximity to 52-week high/low
    | 'rsi'                   // RSI value (if available)
    | 'moving_average_cross'  // Price vs MA

export type ComparisonTarget =
    | 'static_value'          // Compare to a fixed number
    | 'ticker'                // Compare to another ticker
    | 'index'                 // Compare to market index

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ConditionConfig {
    id: string
    ticker: string
    metric: MetricType
    operator: ConditionOperator
    value: number             // Primary threshold
    valueSecondary?: number   // For 'between' operator

    // For relative comparisons
    comparisonType: ComparisonTarget
    comparisonTicker?: string // Other ticker/index to compare against
    comparisonMetric?: MetricType
    comparisonThreshold?: number // Threshold for comparison target
}

export interface WhisperAlert {
    id: string
    name: string
    description?: string
    enabled: boolean
    createdAt: string

    // Conditions
    conditions: ConditionConfig[]
    logicalOperator: LogicalOperator // How to combine multiple conditions

    // Notification settings
    priority: AlertPriority
    notifyOnce: boolean       // Only trigger once until reset

    // State
    triggered: boolean
    lastTriggeredAt?: string
    triggerCount: number
}

// Live market data snapshot for evaluation
export interface MarketDataSnapshot {
    ticker: string
    price: number
    priceChange: number       // $ change
    priceChangePct: number    // % change
    volume: number
    avgVolume30d: number
    high52w: number
    low52w: number
    rsi?: number
    ma50?: number
    ma200?: number
}

// Evaluation result
export interface EvaluationResult {
    alertId: string
    triggered: boolean
    conditionResults: {
        conditionId: string
        met: boolean
        actualValue: number
        expectedValue: number
        description: string
    }[]
    summary: string
}

// Preset templates for common alert patterns
export interface AlertTemplate {
    id: string
    name: string
    description: string
    icon: string
    conditions: Partial<ConditionConfig>[]
    logicalOperator: LogicalOperator
}

// Human-readable labels
export const METRIC_LABELS: Record<MetricType, string> = {
    'price_change_pct': 'Price Change %',
    'price_absolute': 'Price',
    'volume_ratio': 'Volume vs 30d Avg',
    '52w_high_low': '52-Week Range',
    'rsi': 'RSI',
    'moving_average_cross': 'vs Moving Avg',
}

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
    'greater_than': 'is greater than',
    'less_than': 'is less than',
    'equals': 'equals',
    'greater_equal': 'is at least',
    'less_equal': 'is at most',
    'between': 'is between',
}

export const OPERATOR_SYMBOLS: Record<ConditionOperator, string> = {
    'greater_than': '>',
    'less_than': '<',
    'equals': '=',
    'greater_equal': '≥',
    'less_equal': '≤',
    'between': '↔',
}

export const PRIORITY_COLORS: Record<AlertPriority, string> = {
    'low': 'text-blue-400',
    'medium': 'text-yellow-400',
    'high': 'text-orange-500',
    'critical': 'text-red-500',
}

export const PRIORITY_BG: Record<AlertPriority, string> = {
    'low': 'bg-blue-500/10',
    'medium': 'bg-yellow-500/10',
    'high': 'bg-orange-500/10',
    'critical': 'bg-red-500/10',
}
