import type { ValuationVerdict } from "@/lib/finance"

export const VERDICT_LABELS: Record<ValuationVerdict, string> = {
    undervalued: "Undervalued",
    "fairly-valued": "Fairly Valued",
    overvalued: "Overvalued",
}

export const VERDICT_BADGE_STYLES: Record<ValuationVerdict, string> = {
    undervalued:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
    "fairly-valued": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
    overvalued: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40",
}

export const VERDICT_TEXT_STYLES: Record<ValuationVerdict, string> = {
    undervalued: "text-emerald-600 dark:text-emerald-400",
    "fairly-valued": "text-amber-600 dark:text-amber-400",
    overvalued: "text-rose-600 dark:text-rose-400",
}
