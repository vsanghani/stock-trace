import { AlertTemplate } from '@/types/whisper-alert'

/**
 * Pre-built alert templates for common market conditions
 */
export const ALERT_TEMPLATES: AlertTemplate[] = [
    {
        id: 'divergence-spy',
        name: 'Market Divergence',
        description: 'Notify when your stock moves significantly while the market stays flat',
        icon: '📊',
        conditions: [
            {
                metric: 'price_change_pct',
                operator: 'greater_than',
                value: 3,
                comparisonType: 'index',
                comparisonTicker: 'SPY',
                comparisonMetric: 'price_change_pct',
                comparisonThreshold: 0.5,
            },
        ],
        logicalOperator: 'AND',
    },
    {
        id: 'breakout-volume',
        name: '52-Week High + Volume Surge',
        description: 'Notify when stock hits new high with above-average volume',
        icon: '🚀',
        conditions: [
            {
                metric: '52w_high_low',
                operator: 'greater_than',
                value: 0.95,
                comparisonType: 'static_value',
            },
            {
                metric: 'volume_ratio',
                operator: 'greater_than',
                value: 2.0,
                comparisonType: 'static_value',
            },
        ],
        logicalOperator: 'AND',
    },
    {
        id: 'breakdown-volume',
        name: '52-Week Low + Volume Surge',
        description: 'Notify when stock hits new low with high volume (potential capitulation)',
        icon: '📉',
        conditions: [
            {
                metric: '52w_high_low',
                operator: 'less_than',
                value: 0.05,
                comparisonType: 'static_value',
            },
            {
                metric: 'volume_ratio',
                operator: 'greater_than',
                value: 2.5,
                comparisonType: 'static_value',
            },
        ],
        logicalOperator: 'AND',
    },
    {
        id: 'sector-rotation',
        name: 'Sector Rotation Signal',
        description: 'Notify when tech drops but your defensive stock stays green',
        icon: '🔄',
        conditions: [
            {
                metric: 'price_change_pct',
                operator: 'greater_than',
                value: 0,
                comparisonType: 'static_value',
            },
            {
                ticker: 'QQQ',
                metric: 'price_change_pct',
                operator: 'less_than',
                value: -2,
                comparisonType: 'static_value',
            },
        ],
        logicalOperator: 'AND',
    },
    {
        id: 'correlated-pair',
        name: 'Correlated Pair Breakdown',
        description: 'Notify when two normally correlated stocks diverge',
        icon: '⚡',
        conditions: [
            {
                metric: 'price_change_pct',
                operator: 'greater_than',
                value: 5,
                comparisonType: 'ticker',
                comparisonMetric: 'price_change_pct',
                comparisonThreshold: 1,
            },
        ],
        logicalOperator: 'AND',
    },
    {
        id: 'oversold-bounce',
        name: 'Oversold + Price Reversal',
        description: 'Notify when oversold stock (low RSI) starts moving up',
        icon: '🔋',
        conditions: [
            {
                metric: 'rsi',
                operator: 'less_than',
                value: 30,
                comparisonType: 'static_value',
            },
            {
                metric: 'price_change_pct',
                operator: 'greater_than',
                value: 2,
                comparisonType: 'static_value',
            },
        ],
        logicalOperator: 'AND',
    },
]

/**
 * Common market indices for comparison
 */
export const MARKET_INDICES = [
    { ticker: 'SPY', name: 'S&P 500' },
    { ticker: 'QQQ', name: 'Nasdaq 100' },
    { ticker: 'DIA', name: 'Dow Jones' },
    { ticker: 'IWM', name: 'Russell 2000' },
    { ticker: 'VIX', name: 'Volatility Index' },
]
