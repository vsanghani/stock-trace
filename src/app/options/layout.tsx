import type { ReactNode } from "react"
import { privatePageMetadata } from "@/lib/site"

export const metadata = privatePageMetadata(
    "Options",
    "Browse options chains, strikes, and expirations with live underlying quotes."
)

export default function OptionsLayout({ children }: { children: ReactNode }) {
    return children
}
