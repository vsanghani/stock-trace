import type { ReactNode } from "react"
import { privatePageMetadata } from "@/lib/site"

export const metadata = privatePageMetadata(
    "Correlation",
    "Visualize how portfolio holdings move together and spot hidden concentration risk."
)

export default function CorrelationLayout({ children }: { children: ReactNode }) {
    return children
}
