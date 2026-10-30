import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { GET } from "@/app/api/holders/[ticker]/route"
import { aggregateLongEquity, applyAmendments, classifyAmendment, dedupeLines } from "@/lib/holders/amendments"
import { isListedCusip, linkCusips, listedCusips, parse13fList } from "@/lib/holders/cusip-list"
import { earliestRetainedPeriod, isWithinRetention, parseEdgarDate, previousBusinessDay, retainedQuarterEnds } from "@/lib/holders/dates"
import {
    accessionFromFilename,
    datasetWindowEnd,
    discover13fDatasetUrls,
    isForm4,
    isOwnershipForm,
    parseCompanyTickers,
    parseMasterIndex,
    pickRecentDatasets,
} from "@/lib/holders/edgar"
import { clean13fDataset } from "@/lib/holders/parse-13f"
import { currentInsiderPosition, parseForm4Xml } from "@/lib/holders/parse-form4"
import { parseOwnershipXml } from "@/lib/holders/parse-ownership"
import { exceedsFairAccess, requestStartTimes, SEC_MAX_REQUESTS_PER_SECOND } from "@/lib/holders/rate-limit"
import { emptyHolders, resolveHolders, selectMajorHolders, type HolderPosition } from "@/lib/holders/resolve"
import { normalize13fValue } from "@/lib/holders/value"
import { extractEmbeddedXml } from "@/lib/holders/xml"

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__")
const read = (name: string) => readFileSync(join(fixtures, name), "utf8")

function position(partial: HolderPosition): HolderPosition {
    return partial
}

describe("13F value units", () => {
    it("scales pre-2023 filings from thousands of dollars", () => {
        const normalized = normalize13fValue(150000, "2022-11-14")
        expect(normalized.unit).toBe("thousands")
        expect(normalized.valueUsd).toBe(150_000_000)
    })

    it("keeps filings on and after 3 January 2023 in dollars", () => {
        expect(normalize13fValue(150000, "2023-01-02")).toMatchObject({ unit: "thousands", valueUsd: 150_000_000 })
        expect(normalize13fValue(150000, "2023-01-03")).toMatchObject({ unit: "dollars", valueUsd: 150_000 })
        expect(normalize13fValue(8_000_000_000, "2024-08-14")).toMatchObject({ unit: "dollars", valueUsd: 8_000_000_000 })
    })
})

describe("13F amendments", () => {
    it("classifies restatements, new holdings, and notices", () => {
        expect(classifyAmendment({ submissionType: "13F-HR", isAmendment: false, amendmentType: null })).toBe("ORIGINAL")
        expect(classifyAmendment({ submissionType: "13F-HR/A", isAmendment: true, amendmentType: null })).toBe("RESTATEMENT")
        expect(classifyAmendment({ submissionType: "13F-HR/A", isAmendment: true, amendmentType: "NEW HOLDINGS" })).toBe("NEW_HOLDINGS")
        expect(classifyAmendment({ submissionType: "13F-NT", isAmendment: false, amendmentType: null })).toBe("NOTICE")
    })

    it("keeps the highest info-table key when a filing repeats a position", () => {
        const [kept] = dedupeLines([
            { accessionNumber: "a", cusip: "594918104", putCall: null, investmentDiscretion: "SOLE", otherManager: null, infotableSk: 1 },
            { accessionNumber: "a", cusip: "594918104", putCall: null, investmentDiscretion: "SOLE", otherManager: null, infotableSk: 2 },
        ])
        expect(kept.infotableSk).toBe(2)
    })

    it("applies a restatement after new holdings and drops the replaced book", () => {
        const line = (accession: string, cusip: string, sk: number) => ({
            accessionNumber: accession,
            cusip,
            putCall: null,
            investmentDiscretion: "SOLE",
            otherManager: null,
            infotableSk: sk,
        })
        const book = applyAmendments([
            {
                accessionNumber: "orig",
                filedAt: "2024-08-14",
                submissionType: "13F-HR",
                isAmendment: false,
                amendmentType: null,
                holdings: [line("orig", "037833100", 1)],
            },
            {
                accessionNumber: "add",
                filedAt: "2024-08-16",
                submissionType: "13F-HR/A",
                isAmendment: true,
                amendmentType: "NEW HOLDINGS",
                holdings: [line("add", "037833100", 1), line("add", "67066G104", 1)],
            },
            {
                accessionNumber: "rest",
                filedAt: "2024-08-20",
                submissionType: "13F-HR/A",
                isAmendment: true,
                amendmentType: "RESTATEMENT",
                holdings: [line("rest", "594918104", 1)],
            },
        ])
        const active = book.filter((row) => !row.superseded).map((row) => row.cusip)
        expect(active).toEqual(["594918104"])
        expect(book.filter((row) => row.superseded).map((row) => row.cusip).sort()).toEqual(["037833100", "037833100", "67066G104"])
    })
})

describe("AAPL, MSFT, and NVDA 13F fixtures", () => {
    const list = parse13fList(read("13f-list.txt"))
    const cleaned = clean13fDataset({
        submission: read("13f-submission.tsv"),
        coverpage: read("13f-coverpage.tsv"),
        infotable: read("13f-infotable.tsv"),
        listedCusips: listedCusips(list),
    })

    it("rejects CUSIPs that are absent or deleted on the 13(f) list and skips notices", () => {
        expect(isListedCusip("037833100", listedCusips(list))).toBe(true)
        expect(isListedCusip("000000000", listedCusips(list))).toBe(false)
        expect(cleaned.rejectedCusips).toBe(2)
        expect(cleaned.skippedNotices).toBe(1)
    })

    it("restates Vanguard's AAPL position and converts 2022 values from thousands", () => {
        const original = cleaned.holdings.find((row) => row.accessionNumber === "0000102909-22-000111")
        const restated = cleaned.holdings.find((row) => row.accessionNumber === "0000102909-22-000222")
        expect(original?.superseded).toBe(true)
        expect(restated).toMatchObject({
            cusip: "037833100",
            shares: 1_100_000,
            valueUsd: 160_000_000,
            valueUnit: "thousands",
            superseded: false,
        })
    })

    it("dedupes BlackRock's MSFT lines, sums discretion, and leaves the dollar value unscaled", () => {
        const rows = cleaned.holdings.filter((row) => row.filerCik === "0001364742" && !row.superseded)
        const longs = aggregateLongEquity(rows)
        expect(longs).toEqual([
            { cusip: "594918104", shares: 20_000_001, valueUsd: 5_000_001_000 },
            { cusip: "67066G104", shares: 5_000_000, valueUsd: 8_000_000_000 },
        ])
        expect(rows.some((row) => row.putCall === "PUT")).toBe(true)
        expect(longs.some((row) => row.cusip === "037833100")).toBe(false)
    })

    it("adds NVDA as new holdings without removing the MSFT book", () => {
        const nvda = cleaned.holdings.find((row) => row.accessionNumber === "0001364742-24-000444" && !row.superseded)
        const msft = cleaned.holdings.find((row) => row.cusip === "594918104" && row.filerCik === "0001364742" && !row.superseded)
        expect(nvda?.cusip).toBe("67066G104")
        expect(msft?.superseded).toBe(false)
    })

    it("skips report periods outside the retention window", () => {
        const retained = clean13fDataset({
            submission: read("13f-submission.tsv"),
            coverpage: read("13f-coverpage.tsv"),
            infotable: read("13f-infotable.tsv"),
            listedCusips: listedCusips(list),
            retainFrom: "2024-01-01",
        })
        expect(retained.holdings.some((row) => row.filerCik === "0000102909")).toBe(false)
        expect(retained.skippedPeriods).toBe(2)
    })
})

describe("13D, 13G, and Form 4 fixtures", () => {
    it("parses Berkshire's Schedule 13D on AAPL", () => {
        const [position] = parseOwnershipXml(read("aapl-13d.xml"))
        expect(position).toMatchObject({
            formType: "SCHEDULE 13D",
            filerCik: "0001067983",
            filerName: "BERKSHIRE HATHAWAY INC",
            issuerCik: "0000320193",
            issuerCusip: "037833100",
            asOf: "2024-12-18",
            shares: 300_000_000,
            percentOfClass: 5.9,
        })
    })

    it("parses Northstar's Schedule 13G on MSFT", () => {
        const [position] = parseOwnershipXml(read("msft-13g.xml"))
        expect(position).toMatchObject({
            formType: "SCHEDULE 13G",
            filerCik: "0000999991",
            issuerCik: "0000789019",
            issuerCusip: "594918104",
            asOf: "2025-01-15",
            shares: 500_000_000,
            percentOfClass: 6.2,
        })
    })

    it("uses Cook's latest common-stock balance and ignores the option", () => {
        const filing = parseForm4Xml(read("aapl-form4.xml"))
        expect(filing?.ticker).toBe("AAPL")
        expect(filing?.owners[0]).toMatchObject({ name: "COOK TIMOTHY D", isOfficer: true, officerTitle: "Chief Executive Officer" })
        expect(currentInsiderPosition(filing?.rows ?? [], filing?.periodOfReport ?? null)).toEqual({
            shares: 3_380_000,
            asOf: "2024-11-01",
        })
    })

    it("reads Huang's NVDA common-stock balance from Form 4 XML", () => {
        const wrapped = `<SUBMISSION>\n<DOCUMENT><XML>\n${read("nvda-form4.xml")}\n</XML></DOCUMENT>\n</SUBMISSION>`
        const filing = parseForm4Xml(extractEmbeddedXml(wrapped) ?? "")
        expect(filing?.ticker).toBe("NVDA")
        expect(filing?.issuerCik).toBe("0001045810")
        expect(currentInsiderPosition(filing?.rows ?? [], filing?.periodOfReport ?? null)?.shares).toBe(80_000_000)
    })
})

describe("holder overrides", () => {
    const filing = (source: HolderPosition["source"], holder: string, name: string, shares: number, asOf: string, filedAt: string) =>
        position({
            holderCik: holder,
            holderName: name,
            shares,
            valueUsd: source === "13F" ? shares : null,
            percentOfClass: source === "13D" || source === "13G" ? 5 : null,
            source,
            formType: source === "4" ? "4" : source === "13F" ? "13F-HR" : `SCHEDULE ${source}`,
            asOf,
            filedAt,
            accessionNumber: `${holder}-${asOf}`,
            filingUrl: "https://www.sec.gov/Archives/edgar/data/1/example-index.html",
        })

    it("lets a later 13D replace Berkshire's AAPL 13F position", () => {
        const resolved = resolveHolders([
            filing("13F", "0001067983", "BERKSHIRE HATHAWAY INC", 400_000_000, "2024-06-30", "2024-08-14"),
            filing("13D", "0001067983", "BERKSHIRE HATHAWAY INC", 300_000_000, "2024-12-18", "2024-12-18"),
            filing("13F", "0000102909", "VANGUARD GROUP INC", 1_100_000, "2022-09-30", "2022-11-20"),
        ])
        const berkshire = resolved.find((row) => row.holderCik === "0001067983")
        expect(berkshire).toMatchObject({ source: "13D", shares: 300_000_000 })
        expect(resolved.find((row) => row.holderCik === "0000102909")?.source).toBe("13F")
    })

    it("lets Form 4 replace an older 13F position for the same person", () => {
        const aapl = resolveHolders([
            filing("13F", "0001214156", "COOK TIMOTHY D", 4_000_000, "2024-06-30", "2024-08-14"),
            filing("4", "0001214156", "COOK TIMOTHY D", 3_380_000, "2024-11-01", "2024-11-03"),
        ])
        expect(aapl[0]).toMatchObject({ source: "4", shares: 3_380_000 })

        const nvda = resolveHolders([
            filing("13F", "0001168150", "HUANG JENSEN", 100_000_000, "2024-06-30", "2024-08-14"),
            filing("4", "0001168150", "HUANG JENSEN", 80_000_000, "2025-02-01", "2025-02-03"),
            filing("13F", "0001364742", "BlackRock Inc.", 5_000_000, "2024-06-30", "2024-08-16"),
        ])
        expect(nvda.map((row) => [row.holderName, row.source, row.shares])).toEqual([
            ["HUANG JENSEN", "4", 80_000_000],
            ["BlackRock Inc.", "13F", 5_000_000],
        ])
    })

    it("lets a later 13G replace Northstar's MSFT 13F position and keeps a newer 13F over an older 13D", () => {
        const msft = resolveHolders([
            filing("13F", "0000999991", "NORTHSTAR CAPITAL LLC", 1_000, "2024-06-30", "2024-08-14"),
            filing("13G", "0000999991", "NORTHSTAR CAPITAL LLC", 500_000_000, "2025-01-15", "2025-01-16"),
            filing("13F", "0001364742", "BlackRock Inc.", 20_000_001, "2024-06-30", "2024-08-14"),
            filing("13D", "0001364742", "BlackRock Inc.", 1, "2024-01-02", "2024-01-03"),
        ])
        expect(msft.find((row) => row.holderCik === "0000999991")).toMatchObject({ source: "13G", shares: 500_000_000 })
        expect(msft.find((row) => row.holderCik === "0001364742")).toMatchObject({ source: "13F", shares: 20_000_001 })
    })

    it("keeps a 5% filing even when it is outside the largest 25 positions", () => {
        const institutions = Array.from({ length: 30 }, (_, index) =>
            filing("13F", String(1000 + index), `Fund ${index}`, 1_000_000 - index, "2024-06-30", "2024-08-14"),
        )
        const beneficial = filing("13D", "0001067983", "BERKSHIRE HATHAWAY INC", 10, "2024-12-18", "2024-12-18")
        const major = selectMajorHolders(resolveHolders([...institutions, beneficial]))
        expect(major).toHaveLength(26)
        expect(major.some((row) => row.holderCik === "0001067983" && row.source === "13D")).toBe(true)
        expect(major.some((row) => row.holderName === "Fund 29")).toBe(false)
    })
})

describe("CUSIP list and ticker map", () => {
    it("links AAPL, MSFT, and NVDA and leaves dual-class Alphabet unmatched", () => {
        const tickers = parseCompanyTickers(JSON.parse(read("company-tickers.json")))
        expect(tickers.find((row) => row.ticker === "AAPL")?.cik).toBe("0000320193")
        const links = linkCusips(
            tickers.map((row) => ({ ticker: row.ticker, name: row.name })),
            parse13fList(read("13f-list.txt")),
        )
        expect(links).toEqual([
            { ticker: "AAPL", cusip: "037833100" },
            { ticker: "MSFT", cusip: "594918104" },
            { ticker: "NVDA", cusip: "67066G104" },
        ])
    })
})

describe("SEC access and retention", () => {
    it("schedules requests under the 10 per second fair-access cap", () => {
        const times = requestStartTimes(40, SEC_MAX_REQUESTS_PER_SECOND)
        expect(exceedsFairAccess(times, 10)).toBe(false)
        expect(exceedsFairAccess(Array.from({ length: 11 }, () => 0), 10)).toBe(true)
    })

    it("keeps the latest eight quarter-ends and skips older periods", () => {
        expect(retainedQuarterEnds("2026-10-30")).toEqual([
            "2024-12-31",
            "2025-03-31",
            "2025-06-30",
            "2025-09-30",
            "2025-12-31",
            "2026-03-31",
            "2026-06-30",
            "2026-09-30",
        ])
        expect(earliestRetainedPeriod("2026-10-30")).toBe("2024-12-31")
        expect(isWithinRetention("2022-09-30", "2026-10-30")).toBe(false)
        expect(isWithinRetention("2024-12-31", "2026-10-30")).toBe(true)
        expect(parseEdgarDate("14-NOV-2022")).toBe("2022-11-14")
        expect(previousBusinessDay("2026-10-26")).toBe("2026-10-23")
    })

    it("reads the daily index and 13F data-set links", () => {
        const index = parseMasterIndex(`Description: Daily Index
CIK|Company Name|Form Type|Date Filed|File Name
--------------------------------------------------------------------------------
320193|Apple Inc.|4|20241101|edgar/data/320193/0001214156-24-000099.txt
789019|Microsoft Corporation|SCHEDULE 13G|20250115|edgar/data/789019/0000999991-25-000010.txt
320193|Apple Inc.|10-K|20241101|edgar/data/320193/0000320193-24-000010.txt
`)
        expect(index.filter((row) => isForm4(row.formType))).toHaveLength(1)
        expect(index.filter((row) => isOwnershipForm(row.formType))).toHaveLength(1)
        expect(index[0].filedAt).toBe("2024-11-01")
        expect(accessionFromFilename(index[0].filename)).toBe("0001214156-24-000099")

        const html = `
          <a href="/files/structureddata/data/form-13f-data-sets/01mar2025-31may2025_form13f.zip">Q</a>
          <a href="https://www.sec.gov/files/structureddata/data/form-13f-data-sets/01jun2025-31aug2025_form13f.zip">Q</a>
          <a href="https://www.sec.gov/files/structureddata/data/form-13f-data-sets/2023q4_form13f.zip">Q</a>
        `
        expect(datasetWindowEnd("https://www.sec.gov/x/01dec2025-28feb2026_form13f.zip")).toBe("2026-02-28")
        expect(pickRecentDatasets(discover13fDatasetUrls(html), 1)).toEqual([
            "https://www.sec.gov/files/structureddata/data/form-13f-data-sets/01jun2025-31aug2025_form13f.zip",
        ])
    })

    it("describes the 13F delay on an empty response", () => {
        expect(emptyHolders("AAPL")).toMatchObject({
            ticker: "AAPL",
            holders: [],
            unavailable: true,
            note: expect.stringContaining("45 days"),
        })
        expect(emptyHolders("AAPL").note).toContain("long US-listed")
    })
})

describe("holders API without a database", () => {
    const previous = process.env.DATABASE_URL

    afterEach(() => {
        if (previous === undefined) delete process.env.DATABASE_URL
        else process.env.DATABASE_URL = previous
    })

    it("returns an empty payload instead of failing when DATABASE_URL is unset", async () => {
        delete process.env.DATABASE_URL
        const response = await GET(new Request("http://localhost/api/holders/aapl"), {
            params: Promise.resolve({ ticker: "aapl" }),
        })
        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toMatchObject({
            ticker: "AAPL",
            holders: [],
            unavailable: true,
            count: 0,
        })
    })

    it("rejects a ticker that cannot be a symbol", async () => {
        const response = await GET(new Request("http://localhost/api/holders/bad ticker"), {
            params: Promise.resolve({ ticker: "bad ticker" }),
        })
        expect(response.status).toBe(400)
    })
})
