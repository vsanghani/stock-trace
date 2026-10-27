import type { ReactNode } from "react"
import { privatePageMetadata } from "@/lib/site"

export const metadata = privatePageMetadata(
    "Stress Test",
    "Simulate portfolio risk scenarios against historical and hypothetical market events."
)

export default function StressTestLayout({ children }: { children: ReactNode }) {
    return children
}
