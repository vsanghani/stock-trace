import type { ReactNode } from "react"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Whisper Alerts",
    "Multi-variable market alerts that filter noise and surface high-conviction conditions."
)

export default function WhisperAlertsLayout({ children }: { children: ReactNode }) {
    return children
}
