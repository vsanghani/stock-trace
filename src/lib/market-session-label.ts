/** Human-readable label for Yahoo Finance `marketState` values */
export function formatMarketStateLabel(marketState?: string): string {
    if (!marketState) return "Session unknown"
    const labels: Record<string, string> = {
        REGULAR: "Regular session",
        CLOSED: "Market closed",
        PRE: "Pre-market",
        POST: "After hours",
        PREPRE: "Pre-pre market",
        POSTPOST: "Extended hours",
        HALTED: "Halted",
    }
    return labels[marketState] ?? marketState.replace(/_/g, " ")
}
