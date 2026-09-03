import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Valuation",
    "Estimate intrinsic value with an interactive discounted cash flow model and sensitivity analysis."
)

export default function ValuationLayout({ children }: { children: ReactNode }) {
    return children
}
