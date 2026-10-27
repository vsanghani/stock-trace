import type { ReactNode } from "react"
import { privatePageMetadata } from "@/lib/site"

export const metadata = privatePageMetadata(
    "Valuation",
    "Estimate intrinsic value with an interactive discounted cash flow model and sensitivity analysis."
)

export default function ValuationLayout({ children }: { children: ReactNode }) {
    return children
}
