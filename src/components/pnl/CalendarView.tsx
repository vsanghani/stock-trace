"use client"

import * as React from "react"
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePnLStore } from "./usePnLStore"
import { DayDetails } from "./DayDetails"

export function CalendarView() {
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
    const { getDayPnL } = usePnLStore()

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    // Generate calendar days
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    })

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    // Handle day click
    const handleDayClick = (day: Date) => {
        setSelectedDate(format(day, "yyyy-MM-dd"))
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {format(currentDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-full border border-border/50 hover:bg-secondary/50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-full border border-border/50 hover:bg-secondary/50 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-background/30 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-xl">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/20">
                    {weekDays.map(day => (
                        <div key={day} className="py-4 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 auto-rows-[120px]">
                    {days.map((day, idx) => {
                        const dateStr = format(day, "yyyy-MM-dd")
                        const pnl = getDayPnL(dateStr)
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const isToday = isSameDay(day, new Date())

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    relative p-2 border-b border-r border-border/30 transition-all hover:bg-secondary/30 text-left group
                                    ${!isCurrentMonth ? "bg-secondary/5 opacity-50" : ""}
                                    ${isToday ? "bg-primary/5" : ""}
                                `}
                            >
                                <span className={`
                                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}
                                `}>
                                    {format(day, "d")}
                                </span>

                                {pnl !== 0 && (
                                    <div className={`mt-2 flex flex-col items-center justify-center h-16 rounded-xl transition-all ${pnl > 0
                                            ? "bg-green-500/10 text-green-500 group-hover:bg-green-500/20"
                                            : "bg-red-500/10 text-red-500 group-hover:bg-red-500/20"
                                        }`}>
                                        <span className="text-lg font-bold font-mono tracking-tight">
                                            {pnl > 0 ? "+" : ""}{Math.round(pnl)}
                                        </span>
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedDate && (
                    <DayDetails
                        date={selectedDate}
                        onClose={() => setSelectedDate(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
