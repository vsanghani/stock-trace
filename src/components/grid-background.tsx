"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function GridBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId = 0
        let mouseX = -1000
        let mouseY = -1000
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

        const resizeCanvas = () => {
            if (containerRef.current && canvas) {
                canvas.width = containerRef.current.clientWidth
                canvas.height = containerRef.current.clientHeight
            }
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (motionQuery.matches) return
            const rect = canvas.getBoundingClientRect()
            mouseX = e.clientX - rect.left
            mouseY = e.clientY - rect.top
        }

        const handleMouseLeave = () => {
            mouseX = -1000
            mouseY = -1000
        }

        const DOT_SPACING = 20 // Reduced spacing = more dots (2x density approx)
        const DOT_RADIUS = 1.2
        const INTERACTION_RADIUS = 100 // Reduced interaction radius

        // Lerp helper
        const lerp = (start: number, end: number, factor: number) => {
            return start + (end - start) * factor
        }

        let currentMouseX = -1000
        let currentMouseY = -1000

        const render = () => {
            if (!ctx || !canvas) return

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Fluid cursor movement
            currentMouseX = lerp(currentMouseX, mouseX, 0.1)
            currentMouseY = lerp(currentMouseY, mouseY, 0.1)

            const isDark = theme === "dark" || theme === "system"

            const baseColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.045)"
            const activeColor = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.14)"

            const cols = Math.ceil(canvas.width / DOT_SPACING)
            const rows = Math.ceil(canvas.height / DOT_SPACING)

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * DOT_SPACING
                    const y = j * DOT_SPACING

                    const dx = currentMouseX - x
                    const dy = currentMouseY - y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    let size = DOT_RADIUS
                    let color = baseColor

                    if (distance < INTERACTION_RADIUS) {
                        // Reduced effect size (70% reduction request loosely interpreted as smaller scale factor)
                        const scale = 1 - distance / INTERACTION_RADIUS
                        size = DOT_RADIUS + (scale * 1.2) // Reduced scale multiplier
                        color = activeColor
                    }

                    ctx.beginPath()
                    ctx.arc(x, y, size, 0, Math.PI * 2)
                    ctx.fillStyle = color
                    ctx.fill()
                }
            }
        }

        const handleResize = () => {
            resizeCanvas()
            if (motionQuery.matches) render()
        }

        window.addEventListener("resize", handleResize)
        window.addEventListener("mousemove", handleMouseMove) // Listen on window for smoother follow
        canvas.addEventListener("mouseleave", handleMouseLeave)

        resizeCanvas()

        const loop = () => {
            render()
            animationFrameId = requestAnimationFrame(loop)
        }

        // Keep the dot field, but don't run the cursor animation when reduced motion is requested.
        const syncMotion = () => {
            cancelAnimationFrame(animationFrameId)
            if (motionQuery.matches) {
                mouseX = -1000
                mouseY = -1000
                currentMouseX = -1000
                currentMouseY = -1000
                render()
                return
            }
            loop()
        }

        syncMotion()
        motionQuery.addEventListener("change", syncMotion)

        return () => {
            window.removeEventListener("resize", handleResize)
            window.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mouseleave", handleMouseLeave)
            motionQuery.removeEventListener("change", syncMotion)
            cancelAnimationFrame(animationFrameId)
        }
    }, [theme])

    return (
        <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    )
}
