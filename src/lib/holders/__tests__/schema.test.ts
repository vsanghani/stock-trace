import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"

describe("holders schema", () => {
    it("builds current_holders and lets a later 13D replace a 13F position", async () => {
        const db = new PGlite()
        const sql = readFileSync(join(process.cwd(), "db/migrations/001_holders.sql"), "utf8")
        await db.exec(sql)

        const columns = await db.query<{ attname: string }>(
            `SELECT a.attname
             FROM pg_attribute a
             JOIN pg_class c ON c.oid = a.attrelid
             WHERE c.relname = 'current_holders' AND a.attnum > 0 AND NOT a.attisdropped`,
        )
        expect(columns.rows.map((row) => row.attname)).not.toContain("cusip")

        await db.exec(`
            INSERT INTO security (ticker, cik, name, cusip) VALUES ('AAPL', '0000320193', 'Apple Inc.', '037833100');
            INSERT INTO filer (cik, name) VALUES
                ('0001067983', 'BERKSHIRE HATHAWAY INC'),
                ('0000102909', 'VANGUARD GROUP INC'),
                ('0001214156', 'COOK TIMOTHY D');
            INSERT INTO filing (accession_number, form_type, filer_id, filed_at, period_of_report, source_url)
            VALUES
                ('0001067983-24-000010', '13F-HR', (SELECT id FROM filer WHERE cik = '0001067983'), '2024-08-14', '2024-06-30', 'https://www.sec.gov/example/berkshire-13f'),
                ('0001067983-24-000099', 'SCHEDULE 13D', (SELECT id FROM filer WHERE cik = '0001067983'), '2024-12-18', '2024-12-18', 'https://www.sec.gov/example/berkshire-13d'),
                ('0000102909-24-000010', '13F-HR', (SELECT id FROM filer WHERE cik = '0000102909'), '2024-08-14', '2024-06-30', 'https://www.sec.gov/example/vanguard-13f'),
                ('0000102909-24-000011', 'SCHEDULE 13D', (SELECT id FROM filer WHERE cik = '0000102909'), '2024-02-01', '2024-01-15', 'https://www.sec.gov/example/vanguard-13d'),
                ('0001214156-24-000010', '4', (SELECT id FROM filer WHERE cik = '0001214156'), '2024-11-03', '2024-11-01', 'https://www.sec.gov/example/cook-form4'),
                ('0001214156-24-000001', '13F-HR', (SELECT id FROM filer WHERE cik = '0001214156'), '2024-08-14', '2024-06-30', 'https://www.sec.gov/example/cook-13f');

            INSERT INTO holding_13f (
                filing_id, security_id, filer_id, infotable_sk, cusip, value_usd, value_raw, value_unit,
                shares, share_type, put_call, investment_discretion, report_period
            ) VALUES
                ((SELECT id FROM filing WHERE accession_number = '0001067983-24-000010'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0001067983'),
                 1, '037833100', 80000000000, 80000000000, 'dollars', 400000000, 'SH', NULL, 'SOLE', '2024-06-30'),
                ((SELECT id FROM filing WHERE accession_number = '0000102909-24-000010'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0000102909'),
                 1, '037833100', 160000000, 160000, 'thousands', 1100000, 'SH', NULL, 'SOLE', '2024-06-30'),
                ((SELECT id FROM filing WHERE accession_number = '0000102909-24-000010'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0000102909'),
                 2, '037833100', 1000, 1000, 'dollars', 100, 'SH', 'PUT', 'SOLE', '2024-06-30'),
                ((SELECT id FROM filing WHERE accession_number = '0001214156-24-000001'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0001214156'),
                 1, '037833100', 800000000, 800000000, 'dollars', 4000000, 'SH', NULL, 'SOLE', '2024-06-30');

            INSERT INTO ownership_5pct (filing_id, security_id, filer_id, form_type, shares, percent_of_class, as_of)
            VALUES
                ((SELECT id FROM filing WHERE accession_number = '0001067983-24-000099'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0001067983'),
                 'SCHEDULE 13D', 300000000, 5.9, '2024-12-18'),
                ((SELECT id FROM filing WHERE accession_number = '0000102909-24-000011'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0000102909'),
                 'SCHEDULE 13D', 1, 0.1, '2024-01-15');

            INSERT INTO insider_txn (
                filing_id, security_id, filer_id, security_title, transaction_date, shares_following, direct_or_indirect
            ) VALUES
                ((SELECT id FROM filing WHERE accession_number = '0001214156-24-000010'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0001214156'),
                 'Common Stock', '2024-11-01', 3280000, 'D'),
                ((SELECT id FROM filing WHERE accession_number = '0001214156-24-000010'),
                 (SELECT id FROM security WHERE ticker = 'AAPL'),
                 (SELECT id FROM filer WHERE cik = '0001214156'),
                 'Common Stock', '2024-11-01', 100000, 'I');
        `)

        await db.query(
            `INSERT INTO holding_13f (
                filing_id, security_id, filer_id, infotable_sk, cusip, value_usd, value_raw, value_unit,
                shares, share_type, investment_discretion, report_period
             ) VALUES (
                (SELECT id FROM filing WHERE accession_number = '0000102909-24-000010'),
                (SELECT id FROM security WHERE ticker = 'AAPL'),
                (SELECT id FROM filer WHERE cik = '0000102909'),
                3, '037833100', 160000000, 160000, 'thousands', 1100001, 'SH', 'SOLE', '2024-06-30'
             )
             ON CONFLICT (filing_id, line_key) DO UPDATE
             SET shares = EXCLUDED.shares
             WHERE EXCLUDED.infotable_sk >= holding_13f.infotable_sk`,
        )

        await db.exec("REFRESH MATERIALIZED VIEW current_holders")
        const holders = await db.query<{ filer_name: string; source: string; shares: string; percent_of_class: string | null }>(
            `SELECT filer_name, source, shares::text, percent_of_class::text
             FROM current_holders
             WHERE ticker = 'AAPL'
             ORDER BY current_holders.shares DESC`,
        )
        expect(holders.rows).toEqual([
            { filer_name: "BERKSHIRE HATHAWAY INC", source: "13D", shares: "300000000.0000", percent_of_class: "5.9000" },
            { filer_name: "COOK TIMOTHY D", source: "4", shares: "3380000.0000", percent_of_class: null },
            { filer_name: "VANGUARD GROUP INC", source: "13F", shares: "1100001.0000", percent_of_class: null },
        ])

        const relationships = await db.query<{ count: string }>("SELECT count(*)::text AS count FROM company_relationship")
        expect(relationships.rows[0].count).toBe("0")
        await db.close()
    }, 60_000)
})
