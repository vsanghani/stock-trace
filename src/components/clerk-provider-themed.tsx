"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { useTheme } from "next-themes"

/** Mirrors the zinc palette defined in `globals.css` so Clerk's UI matches the app. */
const PALETTE = {
    light: {
        colorBackground: "#ffffff",
        colorForeground: "#09090b",
        colorPrimary: "#18181b",
        colorPrimaryForeground: "#fafafa",
        colorMuted: "#f4f4f5",
        colorMutedForeground: "#71717a",
        colorInput: "#ffffff",
        colorInputForeground: "#09090b",
        colorBorder: "#e4e4e7",
        colorRing: "#18181b",
    },
    dark: {
        colorBackground: "#0c0c10",
        colorForeground: "#fafafa",
        colorPrimary: "#fafafa",
        colorPrimaryForeground: "#18181b",
        colorMuted: "#1c1c20",
        colorMutedForeground: "#a1a1aa",
        colorInput: "#18181b",
        colorInputForeground: "#fafafa",
        colorBorder: "#27272a",
        colorRing: "#d4d4d8",
    },
} as const

export function ClerkProviderThemed({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark"

    return (
        <ClerkProvider
            afterSignOutUrl="/"
            appearance={{
                variables: {
                    ...(isDark ? PALETTE.dark : PALETTE.light),
                    colorDanger: "#ef4444",
                    colorSuccess: "#22c55e",
                    colorWarning: "#f59e0b",
                    borderRadius: "0.75rem",
                    fontFamily: "var(--font-geist-sans)",
                },
                captcha: { theme: isDark ? "dark" : "light" },
                elements: {
                    cardBox: "shadow-xl border border-border/60",
                },
            }}
        >
            {children}
        </ClerkProvider>
    )
}
