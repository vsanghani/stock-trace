"use client"

import * as React from "react"

interface SliderProps {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (value: number) => void
    /** Formats the value shown beside the label */
    format: (value: number) => string
    /** Short explanation rendered under the control */
    hint?: string
    /** Reference value marked on the track, in the same units as `value` */
    benchmark?: number | null
    benchmarkLabel?: string
    disabled?: boolean
}

function toPercent(value: number, min: number, max: number): number {
    if (max <= min) return 0
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function Slider({
    label,
    value,
    min,
    max,
    step,
    onChange,
    format,
    hint,
    benchmark,
    benchmarkLabel,
    disabled = false,
}: SliderProps) {
    const fill = toPercent(value, min, max)
    const showBenchmark =
        benchmark !== null && benchmark !== undefined && benchmark >= min && benchmark <= max

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </label>
                <span className="text-sm font-bold font-mono tabular-nums">{format(value)}</span>
            </div>

            <div className="relative py-1">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(Number(event.target.value))}
                    aria-label={label}
                    className="slider-input relative z-10"
                    style={{ "--slider-fill": `${fill}%` } as React.CSSProperties}
                />

                {showBenchmark && (
                    <span
                        aria-hidden
                        title={benchmarkLabel}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 rounded-full bg-indigo-500/70 pointer-events-none"
                        style={{ left: `${toPercent(benchmark, min, max)}%` }}
                    />
                )}
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>{hint}</span>
                {showBenchmark && benchmarkLabel && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                        <span className="w-2 h-0.5 rounded-full bg-indigo-500/70" />
                        {benchmarkLabel}
                    </span>
                )}
            </div>
        </div>
    )
}
