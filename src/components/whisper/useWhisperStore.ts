"use client"

import { useState, useEffect } from "react"
import { WhisperAlert } from "@/types/whisper-alert"
import { readStoredValue } from "@/lib/storage"

const STORAGE_KEY = "plutox-whisper-alerts"

export function useWhisperStore() {
    const [alerts, setAlerts] = useState<WhisperAlert[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = readStoredValue(STORAGE_KEY)
        if (saved) {
            try {
                setAlerts(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse whisper alerts data", e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Save to localStorage whenever alerts change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
        }
    }, [alerts, isLoaded])

    const addAlert = (alert: Omit<WhisperAlert, "id" | "createdAt" | "triggered" | "triggerCount">) => {
        const newAlert: WhisperAlert = {
            ...alert,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            triggered: false,
            triggerCount: 0,
        }
        setAlerts(prev => [newAlert, ...prev])
        return newAlert
    }

    const updateAlert = (id: string, updates: Partial<WhisperAlert>) => {
        setAlerts(prev =>
            prev.map(a => (a.id === id ? { ...a, ...updates } : a))
        )
    }

    const deleteAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id))
    }

    const toggleAlert = (id: string) => {
        setAlerts(prev =>
            prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a))
        )
    }

    const markTriggered = (id: string) => {
        setAlerts(prev =>
            prev.map(a =>
                a.id === id
                    ? {
                        ...a,
                        triggered: true,
                        lastTriggeredAt: new Date().toISOString(),
                        triggerCount: a.triggerCount + 1,
                    }
                    : a
            )
        )
    }

    const resetTriggered = (id: string) => {
        setAlerts(prev =>
            prev.map(a => (a.id === id ? { ...a, triggered: false } : a))
        )
    }

    const clearAllAlerts = () => {
        setAlerts([])
    }

    return {
        alerts,
        addAlert,
        updateAlert,
        deleteAlert,
        toggleAlert,
        markTriggered,
        resetTriggered,
        clearAllAlerts,
        isLoaded,
    }
}
