import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Dashboard",
    "Research any listed company: live quotes, fundamentals, analyst targets, and sentiment."
)

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return children
}
