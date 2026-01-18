"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-16 h-8 bg-secondary rounded-full" />
    }

    const isDark = theme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative w-16 h-8 rounded-full bg-secondary/50 backdrop-blur-md border border-border flex items-center px-1 transition-colors hover:bg-secondary/80"
            aria-label="Toggle theme"
        >
            <motion.div
                layout
                className="absolute w-6 h-6 rounded-full bg-background shadow-sm flex items-center justify-center"
                initial={false}
                animate={{
                    x: isDark ? 32 : 0
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                {isDark ? (
                    <Moon className="w-4 h-4 text-foreground" />
                ) : (
                    <Sun className="w-4 h-4 text-foreground" />
                )}
            </motion.div>
        </button>
    )
}
