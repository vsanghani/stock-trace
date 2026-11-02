import { getPool } from "@/lib/holders/pool"
import {
    emptyHolders,
    panelAsOf,
    selectMajorHolders,
    type HolderPosition,
    type HolderSource,
    type HoldersPayload,
} from "@/lib/holders/resolve"

interface HolderDbRow {
    filer_name: string
    filer_cik: string
    shares: string | null
    value_usd: string | null
    percent_of_class: string | null
    source: HolderSource
    form_type: string
    as_of: string
    filed_at: string
    accession_number: string
    filing_url: string
}

function numberOrNull(value: string | null): number | null {
    if (value == null || value === "") return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

export async function loadHolders(ticker: string): Promise<HoldersPayload> {
    const pool = getPool()
    const result = await pool.query<HolderDbRow>(
        `SELECT filer_name, filer_cik, shares::text, value_usd::text, percent_of_class::text,
                source, form_type, as_of, filed_at, accession_number, filing_url
         FROM current_holders
         WHERE ticker = $1`,
        [ticker],
    )
    const positions: HolderPosition[] = result.rows.map((row) => ({
        holderCik: row.filer_cik,
        holderName: row.filer_name,
        shares: numberOrNull(row.shares),
        valueUsd: numberOrNull(row.value_usd),
        percentOfClass: numberOrNull(row.percent_of_class),
        source: row.source,
        formType: row.form_type,
        asOf: row.as_of,
        filedAt: row.filed_at,
        accessionNumber: row.accession_number,
        filingUrl: row.filing_url,
    }))
    const holders = selectMajorHolders(positions)
    return {
        ticker,
        holders,
        asOf: panelAsOf(holders),
        count: holders.length,
        note: emptyHolders(ticker).note,
        unavailable: false,
    }
}
