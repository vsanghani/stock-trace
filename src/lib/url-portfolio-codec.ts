import {
    SECTOR_OPTIONS as STRESS_SECTORS,
    type PortfolioHolding,
    type Sector,
} from "@/types/stress-test"
import type { CorrelationHolding, Industry, Sector as CorrSector } from "@/types/correlation"
import { INDUSTRY_BY_SECTOR } from "@/types/correlation"

const STRESS_SECTOR_SET = new Set<string>(STRESS_SECTORS)

function utf8ToBase64Url(json: string): string {
    const bytes = new TextEncoder().encode(json)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
    const base64 = btoa(binary)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToUtf8(encoded: string): string | null {
    try {
        let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
        while (base64.length % 4) base64 += "="
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return new TextDecoder().decode(bytes)
    } catch {
        return null
    }
}

export type StressShareRow = {
    ticker: string
    shares: number
    currentPrice: number
    sector: Sector
    beta?: number
}

export function encodeStressPortfolio(holdings: PortfolioHolding[]): string {
    const rows: StressShareRow[] = holdings.map(
        ({ ticker, shares, currentPrice, sector, beta }) => ({
            ticker,
            shares,
            currentPrice,
            sector,
            ...(beta !== undefined ? { beta } : {}),
        })
    )
    return utf8ToBase64Url(JSON.stringify(rows))
}

export function decodeStressPortfolio(encoded: string): Omit<PortfolioHolding, "id">[] | null {
    const json = base64UrlToUtf8(encoded)
    if (!json) return null
    let data: unknown
    try {
        data = JSON.parse(json)
    } catch {
        return null
    }
    if (!Array.isArray(data) || data.length === 0) return null

    const out: Omit<PortfolioHolding, "id">[] = []
    for (const item of data) {
        if (!item || typeof item !== "object") return null
        const r = item as Record<string, unknown>
        const ticker = typeof r.ticker === "string" ? r.ticker.trim().toUpperCase() : ""
        const shares = typeof r.shares === "number" && Number.isFinite(r.shares) ? r.shares : NaN
        const currentPrice =
            typeof r.currentPrice === "number" && Number.isFinite(r.currentPrice)
                ? r.currentPrice
                : NaN
        const sectorRaw = typeof r.sector === "string" ? r.sector : ""
        const sector = STRESS_SECTOR_SET.has(sectorRaw)
            ? (sectorRaw as Sector)
            : ("Technology" as Sector)

        if (!ticker || shares < 0 || !(currentPrice >= 0)) return null

        const row: Omit<PortfolioHolding, "id"> = {
            ticker,
            shares,
            currentPrice,
            sector,
        }
        if (typeof r.beta === "number" && Number.isFinite(r.beta)) row.beta = r.beta
        out.push(row)
    }
    return out
}

export type CorrelationShareRow = {
    ticker: string
    name?: string
    sector: CorrSector
    industry: Industry
    value?: number
}

export function encodeCorrelationPortfolio(holdings: CorrelationHolding[]): string {
    const rows: CorrelationShareRow[] = holdings.map(
        ({ ticker, name, sector, industry, value }) => ({
            ticker,
            ...(name ? { name } : {}),
            sector,
            industry,
            ...(value !== undefined ? { value } : {}),
        })
    )
    return utf8ToBase64Url(JSON.stringify(rows))
}

function isCorrSector(s: string): s is CorrSector {
    return s in INDUSTRY_BY_SECTOR
}

export function decodeCorrelationPortfolio(encoded: string): Omit<CorrelationHolding, "id">[] | null {
    const json = base64UrlToUtf8(encoded)
    if (!json) return null
    let data: unknown
    try {
        data = JSON.parse(json)
    } catch {
        return null
    }
    if (!Array.isArray(data) || data.length === 0) return null

    const out: Omit<CorrelationHolding, "id">[] = []
    for (const item of data) {
        if (!item || typeof item !== "object") return null
        const r = item as Record<string, unknown>
        const ticker = typeof r.ticker === "string" ? r.ticker.trim().toUpperCase() : ""
        const sectorRaw = typeof r.sector === "string" ? r.sector : ""
        const industryRaw = typeof r.industry === "string" ? r.industry : ""

        if (!ticker || !isCorrSector(sectorRaw)) return null

        const industries = INDUSTRY_BY_SECTOR[sectorRaw]
        const industry = industries.includes(industryRaw as Industry)
            ? (industryRaw as Industry)
            : industries[0]!

        const name = typeof r.name === "string" ? r.name : undefined
        const value =
            typeof r.value === "number" && Number.isFinite(r.value) ? r.value : undefined

        out.push({
            ticker,
            ...(name ? { name } : {}),
            sector: sectorRaw,
            industry,
            ...(value !== undefined ? { value } : {}),
        })
    }
    return out
}
