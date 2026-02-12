"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Trash2,
    Zap,
    AlertCircle,
    ChevronDown,
    Sparkles,
    Save,
    X
} from "lucide-react"
import {
    ConditionConfig,
    WhisperAlert,
    MetricType,
    ConditionOperator,
    ComparisonTarget,
    AlertPriority,
    LogicalOperator,
    METRIC_LABELS,
    OPERATOR_LABELS,
    PRIORITY_COLORS,
    PRIORITY_BG,
} from "@/types/whisper-alert"
import { ALERT_TEMPLATES, MARKET_INDICES } from "@/lib/whisper-templates"
import { generateAlertSentence } from "@/lib/whisper-evaluator"
import { cn } from "@/lib/utils"

interface WhisperAlertCreatorProps {
    onSave: (alert: Omit<WhisperAlert, "id" | "createdAt" | "triggered" | "triggerCount">) => void
    onCancel?: () => void
    existingAlert?: WhisperAlert // For editing
}

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
    { value: 'price_change_pct', label: 'Price Change %' },
    { value: 'price_absolute', label: 'Price' },
    { value: 'volume_ratio', label: 'Volume vs 30d Avg' },
    { value: '52w_high_low', label: '52-Week Range %' },
    { value: 'rsi', label: 'RSI' },
]

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; symbol: string }[] = [
    { value: 'greater_than', label: 'is greater than', symbol: '>' },
    { value: 'less_than', label: 'is less than', symbol: '<' },
    { value: 'greater_equal', label: 'is at least', symbol: '≥' },
    { value: 'less_equal', label: 'is at most', symbol: '≤' },
    { value: 'equals', label: 'equals', symbol: '=' },
    { value: 'between', label: 'is between', symbol: '↔' },
]

const COMPARISON_OPTIONS: { value: ComparisonTarget; label: string }[] = [
    { value: 'static_value', label: 'Fixed Value' },
    { value: 'index', label: 'Market Index' },
    { value: 'ticker', label: 'Another Stock' },
]

const PRIORITY_OPTIONS: AlertPriority[] = ['low', 'medium', 'high', 'critical']

export function WhisperAlertCreator({ onSave, onCancel, existingAlert }: WhisperAlertCreatorProps) {
    const [name, setName] = React.useState(existingAlert?.name || '')
    const [description, setDescription] = React.useState(existingAlert?.description || '')
    const [conditions, setConditions] = React.useState<ConditionConfig[]>(
        existingAlert?.conditions || []
    )
    const [logicalOperator, setLogicalOperator] = React.useState<LogicalOperator>(
        existingAlert?.logicalOperator || 'AND'
    )
    const [priority, setPriority] = React.useState<AlertPriority>(
        existingAlert?.priority || 'medium'
    )
    const [notifyOnce, setNotifyOnce] = React.useState(existingAlert?.notifyOnce ?? true)
    const [showTemplates, setShowTemplates] = React.useState(false)

    // Create empty condition
    const createEmptyCondition = (): ConditionConfig => ({
        id: crypto.randomUUID(),
        ticker: '',
        metric: 'price_change_pct',
        operator: 'greater_than',
        value: 5,
        comparisonType: 'static_value',
    })

    // Add condition
    const addCondition = () => {
        setConditions(prev => [...prev, createEmptyCondition()])
    }

    // Update condition
    const updateCondition = (id: string, updates: Partial<ConditionConfig>) => {
        setConditions(prev =>
            prev.map(c => c.id === id ? { ...c, ...updates } : c)
        )
    }

    // Remove condition
    const removeCondition = (id: string) => {
        setConditions(prev => prev.filter(c => c.id !== id))
    }

    // Apply template
    const applyTemplate = (template: typeof ALERT_TEMPLATES[0]) => {
        const newConditions = template.conditions.map(c => ({
            ...createEmptyCondition(),
            ...c,
        }))
        setConditions(newConditions)
        setLogicalOperator(template.logicalOperator)
        setName(template.name)
        setDescription(template.description)
        setShowTemplates(false)
    }

    // Generate preview sentence
    const previewAlert: WhisperAlert = {
        id: 'preview',
        name,
        description,
        enabled: true,
        createdAt: '',
        conditions,
        logicalOperator,
        priority,
        notifyOnce,
        triggered: false,
        triggerCount: 0,
    }
    const previewSentence = generateAlertSentence(previewAlert)

    // Handle save
    const handleSave = () => {
        if (!name.trim() || conditions.length === 0) return

        onSave({
            name: name.trim(),
            description: description.trim(),
            enabled: true,
            conditions,
            logicalOperator,
            priority,
            notifyOnce,
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    {existingAlert ? 'Edit Alert' : 'Create Whisper Alert'}
                </h2>

                <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                    <Sparkles className="w-4 h-4" />
                    Use Template
                </button>
            </div>

            {/* Templates Panel */}
            <AnimatePresence>
                {showTemplates && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden"
                    >
                        {ALERT_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                onClick={() => applyTemplate(template)}
                                className="text-left p-4 rounded-lg border border-border/50 bg-secondary/30 hover:border-amber-500/50 transition-all"
                            >
                                <div className="text-2xl mb-2">{template.icon}</div>
                                <h4 className="font-semibold text-sm">{template.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {template.description}
                                </p>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Alert Name */}
            <div className="glass rounded-xl p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                            Alert Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., NVDA Breakout Signal"
                            className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-amber-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPriority(p)}
                                    className={cn(
                                        "flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                                        priority === p
                                            ? `${PRIORITY_BG[p]} ${PRIORITY_COLORS[p]} border border-current`
                                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                        Description (Optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What this alert is monitoring..."
                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-amber-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Conditions Builder */}
            <div className="glass rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Conditions
                    </h3>

                    {conditions.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Combine with:</span>
                            <div className="flex rounded-lg overflow-hidden border border-border/50">
                                {(['AND', 'OR'] as LogicalOperator[]).map(op => (
                                    <button
                                        key={op}
                                        onClick={() => setLogicalOperator(op)}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium transition-colors",
                                            logicalOperator === op
                                                ? "bg-amber-500 text-white"
                                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                        )}
                                    >
                                        {op}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Condition Cards */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {conditions.map((condition, index) => (
                            <motion.div
                                key={condition.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="relative"
                            >
                                {/* AND/OR connector */}
                                {index > 0 && (
                                    <div className="absolute -top-2 left-8 px-2 py-0.5 bg-background text-xs font-medium text-amber-500 z-10">
                                        {logicalOperator}
                                    </div>
                                )}

                                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                                    <ConditionRow
                                        condition={condition}
                                        onChange={(updates) => updateCondition(condition.id, updates)}
                                        onRemove={() => removeCondition(condition.id)}
                                        showRemove={conditions.length > 1}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add Condition Button */}
                <button
                    onClick={addCondition}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:border-amber-500 hover:text-amber-500 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Condition
                </button>
            </div>

            {/* Live Preview */}
            {conditions.length > 0 && conditions[0].ticker && (
                <div className="glass rounded-xl p-5">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Live Preview</h4>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                        <p className="font-mono text-sm text-amber-400">
                            {previewSentence}
                        </p>
                    </div>
                </div>
            )}

            {/* Options */}
            <div className="glass rounded-xl p-5">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={notifyOnce}
                        onChange={e => setNotifyOnce(e.target.checked)}
                        className="w-4 h-4 rounded border-border accent-amber-500"
                    />
                    <div>
                        <span className="font-medium">Notify Once</span>
                        <p className="text-xs text-muted-foreground">
                            Only trigger once until manually reset (prevents spam)
                        </p>
                    </div>
                </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <motion.button
                    onClick={handleSave}
                    disabled={!name.trim() || conditions.length === 0 || !conditions[0].ticker}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
                        "bg-gradient-to-r from-amber-600 to-orange-500 text-white",
                        "hover:from-amber-500 hover:to-orange-400",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Save className="w-4 h-4" />
                    {existingAlert ? 'Update Alert' : 'Create Alert'}
                </motion.button>
            </div>
        </div>
    )
}

/**
 * Single condition row builder
 */
function ConditionRow({
    condition,
    onChange,
    onRemove,
    showRemove,
}: {
    condition: ConditionConfig
    onChange: (updates: Partial<ConditionConfig>) => void
    onRemove: () => void
    showRemove: boolean
}) {
    return (
        <div className="space-y-3">
            {/* Main condition row */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-amber-500">IF</span>

                {/* Ticker */}
                <input
                    type="text"
                    value={condition.ticker}
                    onChange={e => onChange({ ticker: e.target.value.toUpperCase() })}
                    placeholder="TICKER"
                    className="w-24 px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none font-mono text-sm uppercase"
                />

                {/* Metric */}
                <select
                    value={condition.metric}
                    onChange={e => onChange({ metric: e.target.value as MetricType })}
                    className="px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none text-sm"
                >
                    {METRIC_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {/* Operator */}
                <select
                    value={condition.operator}
                    onChange={e => onChange({ operator: e.target.value as ConditionOperator })}
                    className="px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none text-sm"
                >
                    {OPERATOR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.symbol} {opt.label}</option>
                    ))}
                </select>

                {/* Value */}
                <input
                    type="number"
                    value={condition.value}
                    onChange={e => onChange({ value: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none font-mono text-sm"
                    step="0.1"
                />

                {condition.metric === 'price_change_pct' && (
                    <span className="text-sm text-muted-foreground">%</span>
                )}

                {/* Remove button */}
                {showRemove && (
                    <button
                        onClick={onRemove}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Comparison type selector */}
            <div className="flex flex-wrap items-center gap-2 pl-6">
                <select
                    value={condition.comparisonType}
                    onChange={e => onChange({ comparisonType: e.target.value as ComparisonTarget })}
                    className="px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none text-sm"
                >
                    {COMPARISON_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {/* Index/Ticker comparison */}
                {(condition.comparisonType === 'index' || condition.comparisonType === 'ticker') && (
                    <>
                        {condition.comparisonType === 'index' ? (
                            <select
                                value={condition.comparisonTicker || ''}
                                onChange={e => onChange({ comparisonTicker: e.target.value })}
                                className="px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none text-sm"
                            >
                                <option value="">Select Index</option>
                                {MARKET_INDICES.map(idx => (
                                    <option key={idx.ticker} value={idx.ticker}>
                                        {idx.ticker} ({idx.name})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={condition.comparisonTicker || ''}
                                onChange={e => onChange({ comparisonTicker: e.target.value.toUpperCase() })}
                                placeholder="TICKER"
                                className="w-24 px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none font-mono text-sm uppercase"
                            />
                        )}

                        <span className="text-sm text-muted-foreground">moves within</span>

                        <input
                            type="number"
                            value={condition.comparisonThreshold || 0}
                            onChange={e => onChange({ comparisonThreshold: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-3 py-1.5 rounded bg-background border border-border/50 focus:border-amber-500 focus:outline-none font-mono text-sm"
                            step="0.1"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                    </>
                )}
            </div>
        </div>
    )
}
