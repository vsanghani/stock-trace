import type { ReactNode } from "react"
import { privatePageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = privatePageMetadata(
    "PnL Calculator",
    `Track daily trades and calendar-based profit and loss on ${SITE_NAME}.`
)

export default function PnLCalculatorLayout({ children }: { children: ReactNode }) {
    return children
}
