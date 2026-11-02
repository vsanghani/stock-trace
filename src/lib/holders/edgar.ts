import { quarterEnd, quarterOf } from "@/lib/holders/dates"

export const SEC_DATASETS_PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets"
export const SEC_13F_LIST_PAGE = "https://www.sec.gov/rules-regulations/staff-guidance/official-list-section-13f-securities"
export const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"

/** Schedules 13D and 13G must be filed as XML on and after this date. */
export const STRUCTURED_OWNERSHIP_START = "2024-12-18"

const MONTHS: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
}

export function edgarIndexUrl(cik: string, accession: string): string {
    const numericCik = String(Number(cik.replace(/\D/g, "")))
    const compact = accession.replace(/-/g, "")
    return `https://www.sec.gov/Archives/edgar/data/${numericCik}/${compact}/${accession}-index.html`
}

export function masterIndexUrl(isoDate: string): string {
    const year = Number(isoDate.slice(0, 4))
    const month = Number(isoDate.slice(5, 7))
    const quarter = quarterOf(month)
    const compact = isoDate.replace(/-/g, "")
    return `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/master.${compact}.idx`
}

export function accessionFromFilename(filename: string): string | null {
    const base = filename.split("/").pop() ?? ""
    const match = /(\d{10}-\d{2}-\d{6})/.exec(base)
    return match?.[1] ?? null
}

export function cikFromArchivePath(filename: string): string | null {
    const match = /edgar\/data\/(\d+)\//i.exec(filename)
    return match?.[1] ?? null
}

export function archivesUrl(filename: string): string {
    const path = filename.replace(/^\/+/, "")
    return `https://www.sec.gov/Archives/${path}`
}

export interface IndexRow {
    cik: string
    name: string
    formType: string
    filedAt: string
    filename: string
}

export function parseMasterIndex(text: string): IndexRow[] {
    const rows: IndexRow[] = []
    for (const line of text.split(/\r?\n/)) {
        if (!line || line.startsWith("CIK|") || line.startsWith("---") || line.startsWith("Description:") || line.includes("Last Data Received")) {
            continue
        }
        const parts = line.split("|")
        if (parts.length < 5) continue
        const [cik, name, formType, filed, filename] = parts
        if (!/^\d+$/.test(cik.trim())) continue
        const compact = filed.trim()
        const filedAt = compact.length === 8
            ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
            : compact
        rows.push({
            cik: cik.trim(),
            name: name.trim(),
            formType: formType.trim(),
            filedAt,
            filename: filename.trim(),
        })
    }
    return rows
}

export function isForm4(formType: string): boolean {
    const normalized = formType.trim().toUpperCase()
    return normalized === "4" || normalized === "4/A"
}

export function isOwnershipForm(formType: string): boolean {
    const normalized = formType.trim().toUpperCase().replace(/\s+/g, " ")
    return (
        normalized === "SCHEDULE 13D" ||
        normalized === "SCHEDULE 13D/A" ||
        normalized === "SCHEDULE 13G" ||
        normalized === "SCHEDULE 13G/A" ||
        normalized === "SC 13D" ||
        normalized === "SC 13D/A" ||
        normalized === "SC 13G" ||
        normalized === "SC 13G/A"
    )
}

export function discover13fDatasetUrls(html: string): string[] {
    const urls = new Set<string>()
    for (const match of html.matchAll(/https?:\/\/www\.sec\.gov\/[^"'<\s]+?_form13f\.zip/gi)) {
        urls.add(match[0])
    }
    for (const match of html.matchAll(/href=["']([^"']+_form13f\.zip)["']/gi)) {
        const href = match[1]
        urls.add(href.startsWith("http") ? href : new URL(href, "https://www.sec.gov").href)
    }
    return [...urls]
}

function dmonyyyy(token: string): string | null {
    const match = /^(\d{2})([A-Za-z]{3})(\d{4})$/.exec(token)
    if (!match) return null
    const month = MONTHS[match[2].toUpperCase()]
    if (!month) return null
    return `${match[3]}-${month}-${match[1]}`
}

export function datasetWindowEnd(url: string): string | null {
    const rolling = /(\d{2}[a-z]{3}\d{4})-(\d{2}[a-z]{3}\d{4})_form13f\.zip$/i.exec(url)
    if (rolling) return dmonyyyy(rolling[2])
    const quarter = /(20\d{2})q([1-4])_form13f\.zip$/i.exec(url)
    if (quarter) return quarterEnd(Number(quarter[1]), Number(quarter[2]) as 1 | 2 | 3 | 4)
    return null
}

/** Newest datasets last, so amendments are applied in publication order. */
export function pickRecentDatasets(urls: string[], count: number): string[] {
    const dated = urls
        .map((url) => ({ url, end: datasetWindowEnd(url) }))
        .filter((item): item is { url: string; end: string } => item.end != null)
    dated.sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : 0))
    return dated.slice(-count).map((item) => item.url)
}

export function discover13fListUrls(html: string): string[] {
    const urls = new Set<string>()
    for (const match of html.matchAll(/https?:\/\/www\.sec\.gov\/[^"'<\s]*13flist[^"'<\s]*\.txt/gi)) {
        urls.add(match[0])
    }
    for (const match of html.matchAll(/href=["']([^"']*13flist[^"']*\.txt)["']/gi)) {
        const href = match[1]
        urls.add(href.startsWith("http") ? href : new URL(href, "https://www.sec.gov").href)
    }
    return [...urls]
}

export function listQuarterRank(url: string): number {
    const match = /13flist(20\d{2})q([1-4])/i.exec(url)
    if (!match) return 0
    return Number(match[1]) * 10 + Number(match[2])
}

export function pickLatest13fList(urls: string[]): string | null {
    if (urls.length === 0) return null
    return [...urls].sort((a, b) => listQuarterRank(a) - listQuarterRank(b)).at(-1) ?? null
}

export function fallback13fListUrls(asOf: string): string[] {
    const year = Number(asOf.slice(0, 4))
    const month = Number(asOf.slice(5, 7))
    const quarter = quarterOf(month)
    const urls: string[] = []
    let y = year
    let q = quarter
    for (let i = 0; i < 3; i += 1) {
        urls.push(`https://www.sec.gov/files/investment/13flist${y}q${q}.txt`)
        q -= 1
        if (q === 0) {
            q = 4
            y -= 1
        }
    }
    return urls
}

export interface TickerRecord {
    ticker: string
    cik: string
    name: string
}

export function parseCompanyTickers(payload: unknown): TickerRecord[] {
    const records: TickerRecord[] = []
    const values = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? Object.values(payload) : []
    for (const entry of values) {
        if (!entry || typeof entry !== "object") continue
        const row = entry as { cik_str?: number | string; ticker?: string; title?: string }
        if (!row.ticker || row.cik_str == null) continue
        const ticker = row.ticker.trim().toUpperCase()
        if (!ticker || /\s/.test(ticker)) continue
        records.push({
            ticker,
            cik: String(row.cik_str).replace(/\D/g, "").padStart(10, "0"),
            name: (row.title ?? ticker).trim(),
        })
    }
    return records
}
