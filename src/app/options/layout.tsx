import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Options",
    "Browse options chains, strikes, and expirations with live underlying quotes."
)

export default function OptionsLayout({ children }: { children: ReactNode }) {
    return children
}
