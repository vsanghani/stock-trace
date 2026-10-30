import { applyAmendments, aggregateLongEquity, type AmendmentLine } from "@/lib/holders/amendments"
import { isListedCusip } from "@/lib/holders/cusip-list"
import { padCik, parseEdgarDate } from "@/lib/holders/dates"
import { column, parseTsv } from "@/lib/holders/tsv"
import { normalize13fValue, type ValueUnit } from "@/lib/holders/value"

export interface CleanFiling {
    accessionNumber: string
    filerCik: string
    filerName: string
    formType: string
    filedAt: string
    periodOfReport: string
    isAmendment: boolean
    amendmentType: string | null
}

export interface CleanHolding extends AmendmentLine {
    filerCik: string
    nameOfIssuer: string
    titleOfClass: string
    figi: string | null
    valueUsd: number
    valueRaw: number
    valueUnit: ValueUnit
    shares: number
    shareType: string | null
    votingSole: number | null
    votingShared: number | null
    votingNone: number | null
    reportPeriod: string
    superseded: boolean
}

export interface Clean13F {
    filings: CleanFiling[]
    holdings: CleanHolding[]
    rejectedCusips: number
    skippedNotices: number
    skippedPeriods: number
}

interface ParsedLine extends CleanHolding {
    infotableSk: number
}

function parseNumber(value: string): number | null {
    if (!value.trim()) return null
    const parsed = Number(value.replace(/,/g, ""))
    return Number.isFinite(parsed) ? parsed : null
}

function normalizePutCall(value: string): string | null {
    const text = value.trim().toUpperCase()
    if (!text) return null
    if (text.startsWith("PUT")) return "PUT"
    if (text.startsWith("CALL")) return "CALL"
    return text
}

function amendmentLabel(value: string, isAmendment: boolean): string | null {
    if (!isAmendment) return null
    const text = value.toUpperCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim()
    if (text.includes("NEW") && text.includes("HOLD")) return "NEW HOLDINGS"
    if (!text) return "RESTATEMENT"
    return text
}

/**
 * Join the SEC Form 13F data-set tables, drop CUSIPs that are not on the
 * official 13(f) list, normalise value units, and apply amendments.
 * `retainFrom` skips report periods older than the retention window.
 */
export function clean13fDataset(input: {
    submission: string
    coverpage: string
    infotable: string
    listedCusips: Set<string>
    retainFrom?: string | null
}): Clean13F {
    const submissions = parseTsv(input.submission)
    const covers = parseTsv(input.coverpage)
    const infoRows = parseTsv(input.infotable)

    const coverByAccession = new Map<string, Record<string, string>>()
    for (const cover of covers) {
        const accession = column(cover, "ACCESSION_NUMBER")
        if (accession) coverByAccession.set(accession, cover)
    }

    const filings = new Map<string, CleanFiling>()
    let skippedNotices = 0
    let skippedPeriods = 0

    for (const row of submissions) {
        const accession = column(row, "ACCESSION_NUMBER")
        const formType = column(row, "SUBMISSIONTYPE", "SUBMISSION_TYPE")
        if (!accession || !formType) continue
        if (formType.toUpperCase().startsWith("13F-NT")) {
            skippedNotices += 1
            continue
        }
        if (!formType.toUpperCase().startsWith("13F-HR")) continue

        const cover = coverByAccession.get(accession)
        const filedAt = parseEdgarDate(column(row, "FILING_DATE"))
        const period = parseEdgarDate(
            column(row, "PERIODOFREPORT") || (cover ? column(cover, "REPORTCALENDARORQUARTER") : ""),
        )
        if (!filedAt || !period) continue
        if (input.retainFrom && period < input.retainFrom) {
            skippedPeriods += 1
            continue
        }

        const amendmentRaw = cover ? column(cover, "AMENDMENTTYPE", "AMENDMENT_TYPE") : ""
        const isAmendment =
            formType.toUpperCase().endsWith("/A") ||
            (cover ? column(cover, "ISAMENDMENT").toUpperCase() === "Y" : false)
        const filerName = cover ? column(cover, "FILINGMANAGER_NAME", "FILINGMANAGERNAME") : ""

        filings.set(accession, {
            accessionNumber: accession,
            filerCik: padCik(column(row, "CIK")),
            filerName: filerName || `CIK ${padCik(column(row, "CIK"))}`,
            formType: formType.toUpperCase(),
            filedAt,
            periodOfReport: period,
            isAmendment,
            amendmentType: amendmentLabel(amendmentRaw, isAmendment),
        })
    }

    const linesByAccession = new Map<string, ParsedLine[]>()
    let rejectedCusips = 0

    for (const row of infoRows) {
        const accession = column(row, "ACCESSION_NUMBER")
        const filing = filings.get(accession)
        if (!filing) continue
        const cusip = column(row, "CUSIP").toUpperCase()
        if (!isListedCusip(cusip, input.listedCusips)) {
            rejectedCusips += 1
            continue
        }
        const shares = parseNumber(column(row, "SSHPRNAMT"))
        const rawValue = parseNumber(column(row, "VALUE"))
        if (shares == null || rawValue == null) continue
        const normalized = normalize13fValue(rawValue, filing.filedAt)
        const figi = column(row, "FIGI")
        const line: ParsedLine = {
            accessionNumber: accession,
            filerCik: filing.filerCik,
            cusip,
            putCall: normalizePutCall(column(row, "PUTCALL", "PUT_CALL")),
            investmentDiscretion: column(row, "INVESTMENTDISCRETION") || null,
            otherManager: column(row, "OTHERMANAGER") || null,
            infotableSk: parseNumber(column(row, "INFOTABLE_SK")) ?? 0,
            nameOfIssuer: column(row, "NAMEOFISSUER"),
            titleOfClass: column(row, "TITLEOFCLASS"),
            figi: figi || null,
            valueUsd: normalized.valueUsd,
            valueRaw: normalized.valueRaw,
            valueUnit: normalized.unit,
            shares,
            shareType: column(row, "SSHPRNAMTTYPE") || null,
            votingSole: parseNumber(column(row, "VOTING_AUTH_SOLE")),
            votingShared: parseNumber(column(row, "VOTING_AUTH_SHARED")),
            votingNone: parseNumber(column(row, "VOTING_AUTH_NONE")),
            reportPeriod: filing.periodOfReport,
            superseded: false,
        }
        const list = linesByAccession.get(accession) ?? []
        list.push(line)
        linesByAccession.set(accession, list)
    }

    const groups = new Map<string, CleanFiling[]>()
    for (const filing of filings.values()) {
        const key = `${filing.filerCik}|${filing.periodOfReport}`
        const list = groups.get(key) ?? []
        list.push(filing)
        groups.set(key, list)
    }

    const holdings: CleanHolding[] = []
    const keptFilings: CleanFiling[] = []

    for (const group of groups.values()) {
        const amended = applyAmendments(
            group.map((filing) => ({
                accessionNumber: filing.accessionNumber,
                filedAt: filing.filedAt,
                submissionType: filing.formType,
                isAmendment: filing.isAmendment,
                amendmentType: filing.amendmentType,
                holdings: linesByAccession.get(filing.accessionNumber) ?? [],
            })),
        )
        if (amended.length === 0) continue
        holdings.push(...amended)
        const used = new Set(amended.map((line) => line.accessionNumber))
        keptFilings.push(...group.filter((filing) => used.has(filing.accessionNumber)))
    }

    keptFilings.sort((a, b) => a.filedAt.localeCompare(b.filedAt) || a.accessionNumber.localeCompare(b.accessionNumber))

    return {
        filings: keptFilings,
        holdings,
        rejectedCusips,
        skippedNotices,
        skippedPeriods,
    }
}

export { aggregateLongEquity }
