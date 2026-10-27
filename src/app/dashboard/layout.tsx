import type { ReactNode } from "react"
import { privatePageMetadata } from "@/lib/site"

export const metadata = privatePageMetadata(
    "Dashboard",
    "Research any listed company: live quotes, fundamentals, analyst targets, and sentiment."
)

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return children
}
