import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Correlation",
    "Visualize how portfolio holdings move together and spot hidden concentration risk."
)

export default function CorrelationLayout({ children }: { children: ReactNode }) {
    return children
}
