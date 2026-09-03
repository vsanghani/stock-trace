/**
 * Offline fallback snapshots.
 *
 * Used when every live provider fails, so the analyzer still demonstrates the
 * model rather than showing an empty page. Figures were captured from Yahoo
 * Finance and are deliberately frozen; the `source` field marks them as mock so
 * the UI can tell the user the numbers are not live.
 */

import type { ValuationSnapshot } from "@/types/valuation"

const CAPTURED_AT = "2026-09-03T00:00:00.000Z"

type MockSeed = Omit<ValuationSnapshot, "netDebt" | "source" | "fetchedAt">

const SEEDS: MockSeed[] = [
    {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        currency: "USD",
        currentPrice: 324.96,
        freeCashFlow: 98_767_000_000,
        freeCashFlowBasis: "annual",
        sharesOutstanding: 14_594_180_000,
        totalDebt: 84_343_996_416,
        totalCash: 62_399_000_576,
        freeCashFlowHistory: [
            { date: "2022-09-30", value: 111_443_000_000 },
            { date: "2023-09-30", value: 99_584_000_000 },
            { date: "2024-09-30", value: 108_807_000_000 },
            { date: "2025-09-30", value: 98_767_000_000 },
        ],
        revenueHistory: [
            { date: "2022-09-30", value: 394_328_000_000 },
            { date: "2023-09-30", value: 383_285_000_000 },
            { date: "2024-09-30", value: 391_035_000_000 },
            { date: "2025-09-30", value: 416_161_000_000 },
        ],
        freeCashFlowGrowth: null,
        revenueGrowth: null,
    },
    {
        ticker: "NVDA",
        companyName: "NVIDIA Corporation",
        currency: "USD",
        currentPrice: 224.41,
        freeCashFlow: 96_676_000_000,
        freeCashFlowBasis: "annual",
        sharesOutstanding: 24_147_000_000,
        totalDebt: 38_860_001_280,
        totalCash: 62_469_001_216,
        freeCashFlowHistory: [
            { date: "2023-01-31", value: 3_808_000_000 },
            { date: "2024-01-31", value: 27_021_000_000 },
            { date: "2025-01-31", value: 60_853_000_000 },
            { date: "2026-01-31", value: 96_676_000_000 },
        ],
        revenueHistory: [
            { date: "2023-01-31", value: 26_974_000_000 },
            { date: "2024-01-31", value: 60_922_000_000 },
            { date: "2025-01-31", value: 130_497_000_000 },
            { date: "2026-01-31", value: 215_938_000_000 },
        ],
        freeCashFlowGrowth: null,
        revenueGrowth: null,
    },
    {
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        currency: "USD",
        currentPrice: 496.82,
        freeCashFlow: 66_987_000_000,
        freeCashFlowBasis: "annual",
        sharesOutstanding: 7_425_545_491,
        totalDebt: 128_812_998_656,
        totalCash: 76_842_999_808,
        freeCashFlowHistory: [
            { date: "2023-06-30", value: 59_475_000_000 },
            { date: "2024-06-30", value: 74_071_000_000 },
            { date: "2025-06-30", value: 71_611_000_000 },
            { date: "2026-06-30", value: 66_987_000_000 },
        ],
        revenueHistory: [
            { date: "2023-06-30", value: 211_915_000_000 },
            { date: "2024-06-30", value: 245_122_000_000 },
            { date: "2025-06-30", value: 281_724_000_000 },
            { date: "2026-06-30", value: 331_839_000_000 },
        ],
        freeCashFlowGrowth: null,
        revenueGrowth: null,
    },
    {
        ticker: "TSLA",
        companyName: "Tesla, Inc.",
        currency: "USD",
        currentPrice: 357.01,
        freeCashFlow: 6_220_000_000,
        freeCashFlowBasis: "annual",
        sharesOutstanding: 3_949_547_394,
        totalDebt: 16_080_000_000,
        totalCash: 43_524_001_792,
        freeCashFlowHistory: [
            { date: "2022-12-31", value: 7_552_000_000 },
            { date: "2023-12-31", value: 4_357_000_000 },
            { date: "2024-12-31", value: 3_581_000_000 },
            { date: "2025-12-31", value: 6_220_000_000 },
        ],
        revenueHistory: [
            { date: "2022-12-31", value: 81_462_000_000 },
            { date: "2023-12-31", value: 96_773_000_000 },
            { date: "2024-12-31", value: 97_690_000_000 },
            { date: "2025-12-31", value: 94_827_000_000 },
        ],
        freeCashFlowGrowth: null,
        revenueGrowth: null,
    },
]

export const MOCK_TICKERS = SEEDS.map((seed) => seed.ticker)

export function getMockSnapshot(ticker: string): ValuationSnapshot | null {
    const seed = SEEDS.find((entry) => entry.ticker === ticker.toUpperCase())
    if (!seed) return null

    return {
        ...seed,
        netDebt: seed.totalDebt - seed.totalCash,
        source: "mock",
        fetchedAt: CAPTURED_AT,
    }
}
