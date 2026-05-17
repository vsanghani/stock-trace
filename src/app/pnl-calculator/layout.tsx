import type { ReactNode } from "react"
import { pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "PnL Calculator",
    `Track daily trades and calendar-based profit and loss on ${SITE_NAME}.`
)

export default function PnLCalculatorLayout({ children }: { children: ReactNode }) {
    return children
}
