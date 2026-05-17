import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Stress Test",
    "Simulate portfolio risk scenarios against historical and hypothetical market events."
)

export default function StressTestLayout({ children }: { children: ReactNode }) {
    return children
}
