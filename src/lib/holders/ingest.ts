import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type pg from "pg"
import { applyAmendments, type AmendmentFiling, type AmendmentLine } from "@/lib/holders/amendments"
import { linkCusips, listedCusips, parse13fList, isListedCusip } from "@/lib/holders/cusip-list"
import { earliestRetainedPeriod, padCik, parseEdgarDate, previousBusinessDay, todayIso } from "@/lib/holders/dates"
import {
    COMPANY_TICKERS_URL,
    SEC_13F_LIST_PAGE,
    SEC_DATASETS_PAGE,
    STRUCTURED_OWNERSHIP_START,
    accessionFromFilename,
    archivesUrl,
    cikFromArchivePath,
    discover13fDatasetUrls,
    discover13fListUrls,
    edgarIndexUrl,
    fallback13fListUrls,
    isForm4,
    isOwnershipForm,
    masterIndexUrl,
    parseCompanyTickers,
    parseMasterIndex,
    pickLatest13fList,
    pickRecentDatasets,
    type IndexRow,
} from "@/lib/holders/edgar"
import { parseForm4Xml } from "@/lib/holders/parse-form4"
import { parseOwnershipXml } from "@/lib/holders/parse-ownership"
import { closePool, getPool, requireSecUserAgent } from "@/lib/holders/pool"
import { defaultLimiter, secDownload, secText, secTextIfExists } from "@/lib/holders/sec-http"
import { column, forEachTsvRow, parseTsv } from "@/lib/holders/tsv"
import { normalize13fValue } from "@/lib/holders/value"
import { extractEmbeddedXml } from "@/lib/holders/xml"
import { openZipEntryStream, readZipText } from "@/lib/holders/zip"

export type Log = (message: string) => void

const silent: Log = () => {}

function chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = []
    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size))
    }
    return batches
}

interface SecurityRow {
    id: number
    ticker: string
    cik: string
    cusip: string | null
    figi: string | null
}

async function loadSecurities(pool: pg.Pool): Promise<SecurityRow[]> {
    const result = await pool.query<{ id: string; ticker: string; cik: string; cusip: string | null; figi: string | null }>(
        "SELECT id, ticker, cik, cusip, figi FROM security",
    )
    return result.rows.map((row) => ({
        id: Number(row.id),
        ticker: row.ticker,
        cik: row.cik,
        cusip: row.cusip,
        figi: row.figi,
    }))
}

async function upsertFilers(pool: pg.Pool, filers: Map<string, string>): Promise<Map<string, number>> {
    const ids = new Map<string, number>()
    const entries = [...filers.entries()]
    for (const batch of chunk(entries, 500)) {
        const result = await pool.query<{ id: string; cik: string }>(
            `INSERT INTO filer (cik, name)
             SELECT * FROM UNNEST($1::text[], $2::text[])
             ON CONFLICT (cik) DO UPDATE
             SET name = EXCLUDED.name, updated_at = now()
             RETURNING id, cik`,
            [batch.map(([cik]) => cik), batch.map(([, name]) => name)],
        )
        for (const row of result.rows) ids.set(row.cik, Number(row.id))
    }
    return ids
}

export async function ingestCik(log: Log = silent): Promise<number> {
    const userAgent = requireSecUserAgent()
    const pool = getPool()
    const limit = defaultLimiter()
    const payload: unknown = JSON.parse(await secText(COMPANY_TICKERS_URL, userAgent, limit))
    const records = parseCompanyTickers(payload)
    let written = 0
    for (const batch of chunk(records, 500)) {
        await pool.query(
            `INSERT INTO security (ticker, cik, name)
             SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[])
             ON CONFLICT (ticker) DO UPDATE
             SET cik = EXCLUDED.cik,
                 name = COALESCE(EXCLUDED.name, security.name),
                 updated_at = now()`,
            [batch.map((row) => row.ticker), batch.map((row) => row.cik), batch.map((row) => row.name)],
        )
        written += batch.length
    }
    log(`Upserted ${written} securities from company_tickers.json`)
    return written
}

async function download13fList(userAgent: string, log: Log): Promise<string> {
    const limit = defaultLimiter()
    const page = await secText(SEC_13F_LIST_PAGE, userAgent, limit)
    const discovered = pickLatest13fList(discover13fListUrls(page))
    const candidates = discovered ? [discovered, ...fallback13fListUrls(todayIso())] : fallback13fListUrls(todayIso())
    let lastError: unknown
    for (const url of candidates) {
        try {
            log(`Downloading 13(f) securities list ${url}`)
            return await secText(url, userAgent, limit)
        } catch (error) {
            lastError = error
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Could not download the SEC 13(f) securities list")
}

async function linkListedCusips(pool: pg.Pool, listText: string, log: Log): Promise<Set<string>> {
    const list = parse13fList(listText)
    const allowed = listedCusips(list)
    const named = await pool.query<{ ticker: string; name: string | null }>(
        "SELECT ticker, name FROM security WHERE cusip IS NULL AND name IS NOT NULL",
    )
    const resolved = linkCusips(
        named.rows
            .filter((row): row is { ticker: string; name: string } => !!row.name)
            .map((row) => ({ ticker: row.ticker, name: row.name })),
        list,
    )
    let linked = 0
    for (const link of resolved) {
        if (!allowed.has(link.cusip)) continue
        try {
            const result = await pool.query(
                `UPDATE security SET cusip = $1, updated_at = now()
                 WHERE ticker = $2 AND cusip IS NULL`,
                [link.cusip, link.ticker],
            )
            linked += result.rowCount ?? 0
        } catch (error) {
            const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
            if (code !== "23505") throw error
        }
    }
    log(`Linked ${linked} tickers to a 13(f) list CUSIP`)
    return allowed
}

interface PreparedFiling {
    accessionNumber: string
    filerCik: string
    filerName: string
    formType: string
    filedAt: string
    period: string
    amendmentType: string | null
    filingId: number
    filerId: number
}

function amendmentLabel(value: string, isAmendment: boolean): string | null {
    if (!isAmendment) return null
    const text = value.toUpperCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim()
    if (text.includes("NEW") && text.includes("HOLD")) return "NEW HOLDINGS"
    if (!text) return "RESTATEMENT"
    return text
}

async function prepareFilings(
    pool: pg.Pool,
    rows: Array<{
        accessionNumber: string
        filerCik: string
        filerName: string
        formType: string
        filedAt: string
        period: string
        amendmentType: string | null
    }>,
): Promise<Map<string, PreparedFiling>> {
    const filerNames = new Map<string, string>()
    for (const row of rows) filerNames.set(row.filerCik, row.filerName)
    const filerIds = await upsertFilers(pool, filerNames)
    const prepared = new Map<string, PreparedFiling>()

    for (const batch of chunk(rows, 400)) {
        const result = await pool.query<{ id: string; accession_number: string }>(
            `INSERT INTO filing (accession_number, form_type, filer_id, filed_at, period_of_report, amendment_type, source_url)
             SELECT * FROM UNNEST($1::text[], $2::text[], $3::bigint[], $4::date[], $5::date[], $6::text[], $7::text[])
             ON CONFLICT (accession_number) DO UPDATE
             SET form_type = EXCLUDED.form_type,
                 filer_id = EXCLUDED.filer_id,
                 filed_at = EXCLUDED.filed_at,
                 period_of_report = EXCLUDED.period_of_report,
                 amendment_type = EXCLUDED.amendment_type,
                 source_url = EXCLUDED.source_url
             RETURNING id, accession_number`,
            [
                batch.map((row) => row.accessionNumber),
                batch.map((row) => row.formType),
                batch.map((row) => filerIds.get(row.filerCik)),
                batch.map((row) => row.filedAt),
                batch.map((row) => row.period),
                batch.map((row) => row.amendmentType),
                batch.map((row) => edgarIndexUrl(row.filerCik, row.accessionNumber)),
            ],
        )
        const byAccession = new Map(batch.map((row) => [row.accessionNumber, row]))
        for (const row of result.rows) {
            const source = byAccession.get(row.accession_number)
            const filerId = source ? filerIds.get(source.filerCik) : undefined
            if (!source || filerId == null) continue
            prepared.set(row.accession_number, {
                ...source,
                filingId: Number(row.id),
                filerId,
            })
        }
    }
    return prepared
}

interface HoldingInsert {
    filingId: number
    securityId: number
    filerId: number
    infotableSk: number
    cusip: string
    figi: string | null
    nameOfIssuer: string
    titleOfClass: string
    valueUsd: number
    valueRaw: number
    valueUnit: string
    shares: number
    shareType: string | null
    putCall: string | null
    investmentDiscretion: string | null
    otherManager: string | null
    votingSole: number | null
    votingShared: number | null
    votingNone: number | null
    reportPeriod: string
}

function holdingKey(row: HoldingInsert): string {
    return [
        row.filingId,
        row.cusip,
        row.putCall ?? "",
        (row.investmentDiscretion ?? "").toUpperCase(),
        row.otherManager ?? "",
    ].join("|")
}

async function insertHoldings(pool: pg.Pool, rows: HoldingInsert[]): Promise<void> {
    if (rows.length === 0) return
    const deduped = new Map<string, HoldingInsert>()
    for (const row of rows) {
        const key = holdingKey(row)
        const previous = deduped.get(key)
        if (!previous || row.infotableSk >= previous.infotableSk) deduped.set(key, row)
    }
    const batch = [...deduped.values()]
    await pool.query(
        `INSERT INTO holding_13f (
            filing_id, security_id, filer_id, infotable_sk, cusip, figi, name_of_issuer, title_of_class,
            value_usd, value_raw, value_unit, shares, share_type, put_call, investment_discretion,
            other_manager, voting_sole, voting_shared, voting_none, report_period, superseded
         )
         SELECT * FROM UNNEST(
            $1::bigint[], $2::bigint[], $3::bigint[], $4::bigint[], $5::text[], $6::text[], $7::text[], $8::text[],
            $9::numeric[], $10::numeric[], $11::text[], $12::numeric[], $13::text[], $14::text[], $15::text[],
            $16::text[], $17::numeric[], $18::numeric[], $19::numeric[], $20::date[], $21::boolean[]
         )
         ON CONFLICT (filing_id, line_key) DO UPDATE
         SET infotable_sk = EXCLUDED.infotable_sk,
             figi = EXCLUDED.figi,
             name_of_issuer = EXCLUDED.name_of_issuer,
             title_of_class = EXCLUDED.title_of_class,
             value_usd = EXCLUDED.value_usd,
             value_raw = EXCLUDED.value_raw,
             value_unit = EXCLUDED.value_unit,
             shares = EXCLUDED.shares,
             share_type = EXCLUDED.share_type,
             voting_sole = EXCLUDED.voting_sole,
             voting_shared = EXCLUDED.voting_shared,
             voting_none = EXCLUDED.voting_none,
             superseded = false
         WHERE EXCLUDED.infotable_sk >= holding_13f.infotable_sk`,
        [
            batch.map((row) => row.filingId),
            batch.map((row) => row.securityId),
            batch.map((row) => row.filerId),
            batch.map((row) => row.infotableSk),
            batch.map((row) => row.cusip),
            batch.map((row) => row.figi),
            batch.map((row) => row.nameOfIssuer),
            batch.map((row) => row.titleOfClass),
            batch.map((row) => row.valueUsd),
            batch.map((row) => row.valueRaw),
            batch.map((row) => row.valueUnit),
            batch.map((row) => row.shares),
            batch.map((row) => row.shareType),
            batch.map((row) => row.putCall),
            batch.map((row) => row.investmentDiscretion),
            batch.map((row) => row.otherManager),
            batch.map((row) => row.votingSole),
            batch.map((row) => row.votingShared),
            batch.map((row) => row.votingNone),
            batch.map((row) => row.reportPeriod),
            batch.map(() => false),
        ],
    )
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

async function recomputeSuperseded(pool: pg.Pool, groups: Array<{ filerId: number; period: string }>, log: Log): Promise<void> {
    let updated = 0
    for (const group of groups) {
        const result = await pool.query<{
            filing_id: string
            accession_number: string
            filed_at: string
            form_type: string
            amendment_type: string | null
            holding_id: string
            cusip: string
            put_call: string | null
            investment_discretion: string | null
            other_manager: string | null
            infotable_sk: string
        }>(
            `SELECT f.id AS filing_id, f.accession_number, f.filed_at::text, f.form_type, f.amendment_type,
                    h.id AS holding_id, h.cusip, h.put_call, h.investment_discretion, h.other_manager, h.infotable_sk::text
             FROM holding_13f h
             JOIN filing f ON f.id = h.filing_id
             WHERE h.filer_id = $1 AND h.report_period = $2::date`,
            [group.filerId, group.period],
        )
        const byFiling = new Map<string, AmendmentFiling<AmendmentLine & { id: number }>>()
        for (const row of result.rows) {
            const existing = byFiling.get(row.accession_number) ?? {
                accessionNumber: row.accession_number,
                filedAt: row.filed_at,
                submissionType: row.form_type,
                isAmendment: row.form_type.endsWith("/A") || row.amendment_type != null,
                amendmentType: row.amendment_type,
                holdings: [],
            }
            existing.holdings.push({
                id: Number(row.holding_id),
                accessionNumber: row.accession_number,
                cusip: row.cusip,
                putCall: row.put_call,
                investmentDiscretion: row.investment_discretion,
                otherManager: row.other_manager,
                infotableSk: Number(row.infotable_sk),
            })
            byFiling.set(row.accession_number, existing)
        }
        const book = applyAmendments([...byFiling.values()])
        const changes = book.filter((line) => line.id != null)
        for (const batch of chunk(changes, 400)) {
            await pool.query(
                `UPDATE holding_13f AS h
                 SET superseded = v.superseded
                 FROM (SELECT * FROM UNNEST($1::bigint[], $2::boolean[]) AS v(id, superseded)) v
                 WHERE h.id = v.id AND h.superseded IS DISTINCT FROM v.superseded`,
                [batch.map((line) => line.id), batch.map((line) => line.superseded)],
            )
            updated += batch.length
        }
    }
    log(`Recomputed amendment flags across ${groups.length} filer quarters (${updated} lines)`)
}

export async function ingest13f(log: Log = silent): Promise<void> {
    const userAgent = requireSecUserAgent()
    const pool = getPool()
    const limit = defaultLimiter()
    const retainFrom = earliestRetainedPeriod(todayIso())
    log(`Keeping 13F report periods on or after ${retainFrom}. Older quarters are skipped.`)

    const listText = await download13fList(userAgent, log)
    const allowed = await linkListedCusips(pool, listText, log)
    const securities = await loadSecurities(pool)
    const securityByCusip = new Map<string, SecurityRow>()
    for (const security of securities) {
        if (security.cusip && allowed.has(security.cusip)) securityByCusip.set(security.cusip, security)
    }
    log(`Tracking ${securityByCusip.size} listed CUSIPs`)

    const page = await secText(SEC_DATASETS_PAGE, userAgent, limit)
    const datasets = pickRecentDatasets(discover13fDatasetUrls(page), 9)
    if (datasets.length === 0) throw new Error("No Form 13F data-set ZIPs were found on the SEC data-sets page")

    const touched = new Map<string, { filerId: number; period: string }>()
    const figiSeen = new Set<number>()

    for (const url of datasets) {
        log(`Downloading ${url}`)
        const directory = await mkdtemp(join(tmpdir(), "plutox-13f-"))
        const zipPath = join(directory, "form13f.zip")
        try {
            await secDownload(url, zipPath, userAgent, limit)
            const submission = await readZipText(zipPath, "SUBMISSION.tsv")
            const coverpage = await readZipText(zipPath, "COVERPAGE.tsv")
            const covers = new Map<string, Record<string, string>>()
            for (const row of parseTsv(coverpage)) {
                const accession = column(row, "ACCESSION_NUMBER")
                if (accession) covers.set(accession, row)
            }
            const pending: Array<{
                accessionNumber: string
                filerCik: string
                filerName: string
                formType: string
                filedAt: string
                period: string
                amendmentType: string | null
            }> = []
            for (const row of parseTsv(submission)) {
                const formType = column(row, "SUBMISSIONTYPE", "SUBMISSION_TYPE").toUpperCase()
                if (!formType.startsWith("13F-HR")) continue
                const accession = column(row, "ACCESSION_NUMBER")
                const filedAt = parseEdgarDate(column(row, "FILING_DATE"))
                const cover = covers.get(accession)
                const period = parseEdgarDate(column(row, "PERIODOFREPORT") || (cover ? column(cover, "REPORTCALENDARORQUARTER") : ""))
                if (!accession || !filedAt || !period || period < retainFrom) continue
                const isAmendment = formType.endsWith("/A") || (cover ? column(cover, "ISAMENDMENT").toUpperCase() === "Y" : false)
                const cik = padCik(column(row, "CIK"))
                pending.push({
                    accessionNumber: accession,
                    filerCik: cik,
                    filerName: (cover && column(cover, "FILINGMANAGER_NAME")) || `CIK ${cik}`,
                    formType,
                    filedAt,
                    period,
                    amendmentType: amendmentLabel(cover ? column(cover, "AMENDMENTTYPE") : "", isAmendment),
                })
            }
            const prepared = await prepareFilings(pool, pending)
            const filingIds = [...prepared.values()].map((filing) => filing.filingId)
            for (const batch of chunk(filingIds, 1000)) {
                await pool.query("DELETE FROM holding_13f WHERE filing_id = ANY($1::bigint[])", [batch])
            }

            const opened = await openZipEntryStream(zipPath, "INFOTABLE.tsv")
            let inserted = 0
            let rejected = 0
            let buffer: HoldingInsert[] = []
            const flush = async () => {
                if (buffer.length === 0) return
                await insertHoldings(pool, buffer)
                inserted += buffer.length
                buffer = []
            }
            try {
                await forEachTsvRow(opened.stream, async (row) => {
                    const filing = prepared.get(column(row, "ACCESSION_NUMBER"))
                    if (!filing) return
                    const cusip = column(row, "CUSIP").toUpperCase()
                    if (!isListedCusip(cusip, allowed)) {
                        rejected += 1
                        return
                    }
                    const security = securityByCusip.get(cusip)
                    if (!security) return
                    const shares = parseNumber(column(row, "SSHPRNAMT"))
                    const rawValue = parseNumber(column(row, "VALUE"))
                    if (shares == null || rawValue == null) return
                    const normalized = normalize13fValue(rawValue, filing.filedAt)
                    const figi = column(row, "FIGI") || null
                    buffer.push({
                        filingId: filing.filingId,
                        securityId: security.id,
                        filerId: filing.filerId,
                        infotableSk: parseNumber(column(row, "INFOTABLE_SK")) ?? 0,
                        cusip,
                        figi,
                        nameOfIssuer: column(row, "NAMEOFISSUER"),
                        titleOfClass: column(row, "TITLEOFCLASS"),
                        valueUsd: normalized.valueUsd,
                        valueRaw: normalized.valueRaw,
                        valueUnit: normalized.unit,
                        shares,
                        shareType: column(row, "SSHPRNAMTTYPE") || null,
                        putCall: normalizePutCall(column(row, "PUTCALL")),
                        investmentDiscretion: column(row, "INVESTMENTDISCRETION") || null,
                        otherManager: column(row, "OTHERMANAGER") || null,
                        votingSole: parseNumber(column(row, "VOTING_AUTH_SOLE")),
                        votingShared: parseNumber(column(row, "VOTING_AUTH_SHARED")),
                        votingNone: parseNumber(column(row, "VOTING_AUTH_NONE")),
                        reportPeriod: filing.period,
                    })
                    touched.set(`${filing.filerId}|${filing.period}`, { filerId: filing.filerId, period: filing.period })
                    if (figi && !security.figi && !figiSeen.has(security.id)) {
                        figiSeen.add(security.id)
                        security.figi = figi
                        await pool.query("UPDATE security SET figi = $1, updated_at = now() WHERE id = $2 AND figi IS NULL", [
                            figi,
                            security.id,
                        ])
                    }
                    if (buffer.length >= 400) await flush()
                })
                await flush()
            } finally {
                opened.close()
            }
            log(`Loaded ${url}: ${inserted} holding rows, ${rejected} CUSIPs not on the 13(f) list`)
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    }

    await recomputeSuperseded(pool, [...touched.values()], log)
}

async function findSecurity(pool: pg.Pool, match: { ticker?: string | null; cik?: string | null; cusip?: string | null }): Promise<SecurityRow | null> {
    if (match.cusip) {
        const byCusip = await pool.query<{ id: string; ticker: string; cik: string; cusip: string | null; figi: string | null }>(
            "SELECT id, ticker, cik, cusip, figi FROM security WHERE cusip = $1",
            [match.cusip],
        )
        if (byCusip.rows[0]) {
            const row = byCusip.rows[0]
            return { id: Number(row.id), ticker: row.ticker, cik: row.cik, cusip: row.cusip, figi: row.figi }
        }
    }
    if (match.ticker) {
        const byTicker = await pool.query<{ id: string; ticker: string; cik: string; cusip: string | null; figi: string | null }>(
            "SELECT id, ticker, cik, cusip, figi FROM security WHERE ticker = $1",
            [match.ticker.toUpperCase()],
        )
        if (byTicker.rows[0]) {
            const row = byTicker.rows[0]
            return { id: Number(row.id), ticker: row.ticker, cik: row.cik, cusip: row.cusip, figi: row.figi }
        }
    }
    if (match.cik) {
        const byCik = await pool.query<{ id: string; ticker: string; cik: string; cusip: string | null; figi: string | null }>(
            "SELECT id, ticker, cik, cusip, figi FROM security WHERE cik = $1",
            [padCik(match.cik)],
        )
        if (byCik.rows.length === 1) {
            const row = byCik.rows[0]
            return { id: Number(row.id), ticker: row.ticker, cik: row.cik, cusip: row.cusip, figi: row.figi }
        }
    }
    return null
}

async function rememberCusip(pool: pg.Pool, security: SecurityRow, cusip: string | null): Promise<void> {
    if (!cusip || security.cusip) return
    try {
        await pool.query("UPDATE security SET cusip = $1, updated_at = now() WHERE id = $2 AND cusip IS NULL", [cusip, security.id])
        security.cusip = cusip
    } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
        if (code !== "23505") throw error
    }
}

async function ingestIndexFilings(kind: "ownership" | "form4", isoDate: string, log: Log): Promise<number> {
    const userAgent = requireSecUserAgent()
    const pool = getPool()
    const limit = defaultLimiter()
    const url = masterIndexUrl(isoDate)
    const text = await secTextIfExists(url, userAgent, limit)
    if (text == null) {
        log(`No SEC master index for ${isoDate}. Nothing to ingest.`)
        return 0
    }
    const rows = parseMasterIndex(text).filter((row) => (kind === "form4" ? isForm4(row.formType) : isOwnershipForm(row.formType)))
    const eligible = rows.filter((row) => kind === "form4" || row.filedAt >= STRUCTURED_OWNERSHIP_START)
    log(`${eligible.length} ${kind} filings in the ${isoDate} index`)
    let stored = 0
    for (const row of eligible) {
        const accession = accessionFromFilename(row.filename)
        if (!accession) continue
        const archiveCik = cikFromArchivePath(row.filename) ?? row.cik
        const body = await secTextIfExists(archivesUrl(row.filename), userAgent, limit)
        if (!body) continue
        const xml = extractEmbeddedXml(body)
        if (!xml) continue
        if (kind === "ownership") stored += await storeOwnership(pool, row, accession, archiveCik, xml)
        else stored += await storeForm4(pool, row, accession, archiveCik, xml)
    }
    log(`Stored ${stored} ${kind} rows for ${isoDate}`)
    return stored
}

async function storeOwnership(pool: pg.Pool, row: IndexRow, accession: string, archiveCik: string, xml: string): Promise<number> {
    const positions = parseOwnershipXml(xml)
    if (positions.length === 0) return 0
    const security = await findSecurity(pool, {
        cik: positions[0].issuerCik,
        cusip: positions[0].issuerCusip,
    })
    if (!security) return 0
    await rememberCusip(pool, security, positions[0].issuerCusip)
    const filerIds = await upsertFilers(pool, new Map(positions.map((position) => [position.filerCik, position.filerName])))
    const headerFiler = filerIds.get(positions[0].filerCik)
    const filing = await pool.query<{ id: string }>(
        `INSERT INTO filing (accession_number, form_type, filer_id, filed_at, period_of_report, amendment_type, source_url)
         VALUES ($1, $2, $3, $4, $5, NULL, $6)
         ON CONFLICT (accession_number) DO UPDATE
         SET form_type = EXCLUDED.form_type,
             filer_id = EXCLUDED.filer_id,
             filed_at = EXCLUDED.filed_at,
             period_of_report = EXCLUDED.period_of_report,
             source_url = EXCLUDED.source_url
         RETURNING id`,
        [accession, positions[0].formType, headerFiler ?? null, row.filedAt, positions[0].asOf, edgarIndexUrl(archiveCik, accession)],
    )
    const filingId = Number(filing.rows[0].id)
    await pool.query("DELETE FROM ownership_5pct WHERE filing_id = $1", [filingId])
    for (const position of positions) {
        const filerId = filerIds.get(position.filerCik)
        if (filerId == null) continue
        await pool.query(
            `INSERT INTO ownership_5pct (filing_id, security_id, filer_id, form_type, shares, percent_of_class, cusip, class_title, as_of)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (filing_id, filer_id) DO UPDATE
             SET shares = EXCLUDED.shares,
                 percent_of_class = EXCLUDED.percent_of_class,
                 cusip = EXCLUDED.cusip,
                 class_title = EXCLUDED.class_title,
                 as_of = EXCLUDED.as_of`,
            [
                filingId,
                security.id,
                filerId,
                position.formType,
                position.shares,
                position.percentOfClass,
                position.issuerCusip,
                position.classTitle,
                position.asOf,
            ],
        )
    }
    return positions.length
}

async function storeForm4(pool: pg.Pool, row: IndexRow, accession: string, archiveCik: string, xml: string): Promise<number> {
    const filing = parseForm4Xml(xml)
    if (!filing || filing.owners.length === 0) return 0
    let security = await findSecurity(pool, { ticker: filing.ticker, cik: filing.issuerCik })
    if (!security) {
        const inserted = await pool.query<{ id: string }>(
            `INSERT INTO security (ticker, cik, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (ticker) DO UPDATE SET cik = EXCLUDED.cik, updated_at = now()
             RETURNING id`,
            [filing.ticker, filing.issuerCik, filing.issuerName],
        )
        security = {
            id: Number(inserted.rows[0].id),
            ticker: filing.ticker,
            cik: filing.issuerCik,
            cusip: null,
            figi: null,
        }
    }
    const owner = filing.owners[0]
    const filerIds = await upsertFilers(pool, new Map(filing.owners.map((person) => [person.cik, person.name])))
    const saved = await pool.query<{ id: string }>(
        `INSERT INTO filing (accession_number, form_type, filer_id, filed_at, period_of_report, amendment_type, source_url)
         VALUES ($1, $2, $3, $4, $5, NULL, $6)
         ON CONFLICT (accession_number) DO UPDATE
         SET form_type = EXCLUDED.form_type,
             filer_id = EXCLUDED.filer_id,
             filed_at = EXCLUDED.filed_at,
             period_of_report = EXCLUDED.period_of_report,
             source_url = EXCLUDED.source_url
         RETURNING id`,
        [
            accession,
            filing.formType,
            filerIds.get(owner.cik) ?? null,
            row.filedAt,
            filing.periodOfReport ?? row.filedAt,
            edgarIndexUrl(archiveCik, accession),
        ],
    )
    const filingId = Number(saved.rows[0].id)
    await pool.query("DELETE FROM insider_txn WHERE filing_id = $1", [filingId])
    for (const person of filing.owners) {
        const filerId = filerIds.get(person.cik)
        if (filerId == null) continue
        for (const txn of filing.rows) {
            await pool.query(
                `INSERT INTO insider_txn (
                    filing_id, security_id, filer_id, security_title, transaction_date, transaction_code,
                    acquired_disposed, shares, price_per_share, shares_following, direct_or_indirect,
                    is_officer, is_director, is_ten_percent, officer_title
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
                [
                    filingId,
                    security.id,
                    filerId,
                    txn.securityTitle,
                    txn.transactionDate,
                    txn.transactionCode,
                    txn.acquiredDisposed,
                    txn.shares,
                    txn.pricePerShare,
                    txn.sharesFollowing,
                    txn.directOrIndirect,
                    person.isOfficer,
                    person.isDirector,
                    person.isTenPercent,
                    person.officerTitle,
                ],
            )
        }
    }
    return filing.rows.length
}

export async function ingestOwnership(log: Log = silent, isoDate = previousBusinessDay(todayIso())): Promise<number> {
    return ingestIndexFilings("ownership", isoDate, log)
}

export async function ingestForm4(log: Log = silent, isoDate = previousBusinessDay(todayIso())): Promise<number> {
    return ingestIndexFilings("form4", isoDate, log)
}

export async function pruneOldFilings(log: Log = silent): Promise<number> {
    const pool = getPool()
    const retainFrom = earliestRetainedPeriod(todayIso())
    const result = await pool.query("DELETE FROM filing WHERE COALESCE(period_of_report, filed_at) < $1::date", [retainFrom])
    log(`Pruned ${result.rowCount ?? 0} filings before ${retainFrom}`)
    return result.rowCount ?? 0
}

export async function refreshHolders(log: Log = silent): Promise<void> {
    const pool = getPool()
    const client = await pool.connect()
    try {
        await client.query("SET statement_timeout = '30min'")
        try {
            await client.query("REFRESH MATERIALIZED VIEW CONCURRENTLY current_holders")
        } catch (error) {
            log(`Concurrent refresh failed (${error instanceof Error ? error.message : "unknown"}); refreshing in place`)
            await client.query("REFRESH MATERIALIZED VIEW current_holders")
        }
        log("Refreshed current_holders")
    } finally {
        client.release()
    }
}

export async function closeIngest(): Promise<void> {
    await closePool()
}

export function parseIngestDate(value: string | undefined): string | undefined {
    if (!value) return undefined
    const parsed = parseEdgarDate(value)
    if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`Expected --date YYYY-MM-DD, received ${value}`)
    }
    return parsed
}
