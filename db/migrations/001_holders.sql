-- US holder filings from SEC EDGAR.
--
-- CUSIP is stored for internal joins only. It is licensed by the American
-- Bankers Association / CUSIP Global Services and must not be selected by
-- the API or rendered in the UI. FIGI is optional and internal as well.
--
-- current_holders keeps one row per security and filer:
--   * 13F lines are long equity only (no puts, calls, or principal amounts)
--   * a 13D, 13G, or Form 4 position replaces a 13F position for the same
--     filer when its as-of date is on or after the 13F report period
--   * the newer of those overrides wins
-- This matches resolveHolders() in src/lib/holders/resolve.ts.
--
-- Quarters older than the latest eight are deleted by the ingestion job.
-- Archiving that history to Parquet is a follow-up and is not done here.

CREATE TABLE security (
    id          bigserial PRIMARY KEY,
    ticker      text NOT NULL,
    cik         text NOT NULL,
    cusip       text,
    figi        text,
    name        text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT security_ticker_unique UNIQUE (ticker),
    CONSTRAINT security_cusip_format CHECK (cusip IS NULL OR cusip ~ '^[0-9A-Z]{9}$')
);

CREATE INDEX security_cik_idx ON security (cik);
CREATE UNIQUE INDEX security_cusip_unique ON security (cusip) WHERE cusip IS NOT NULL;

COMMENT ON COLUMN security.cusip IS 'Internal join key. Do not expose. Licensed by ABA / CUSIP Global Services.';
COMMENT ON COLUMN security.figi IS 'Optional internal identifier. Do not expose.';

CREATE TABLE filer (
    id          bigserial PRIMARY KEY,
    cik         text NOT NULL,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT filer_cik_unique UNIQUE (cik)
);

CREATE TABLE filing (
    id                bigserial PRIMARY KEY,
    accession_number  text NOT NULL,
    form_type         text NOT NULL,
    filer_id          bigint REFERENCES filer (id),
    filed_at          date NOT NULL,
    period_of_report  date,
    amendment_type    text,
    source_url        text NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT filing_accession_unique UNIQUE (accession_number)
);

CREATE INDEX filing_form_filed_idx ON filing (form_type, filed_at);
CREATE INDEX filing_period_idx ON filing (period_of_report);

CREATE TABLE holding_13f (
    id                     bigserial PRIMARY KEY,
    filing_id              bigint NOT NULL REFERENCES filing (id) ON DELETE CASCADE,
    security_id            bigint NOT NULL REFERENCES security (id),
    filer_id               bigint NOT NULL REFERENCES filer (id),
    infotable_sk           bigint NOT NULL DEFAULT 0,
    cusip                  text NOT NULL,
    figi                   text,
    name_of_issuer         text,
    title_of_class         text,
    value_usd              numeric(20, 2) NOT NULL,
    value_raw              numeric(20, 2) NOT NULL,
    value_unit             text NOT NULL CHECK (value_unit IN ('dollars', 'thousands')),
    shares                 numeric(20, 4) NOT NULL,
    share_type             text,
    put_call               text,
    investment_discretion  text,
    other_manager          text,
    voting_sole            numeric(20, 4),
    voting_shared          numeric(20, 4),
    voting_none            numeric(20, 4),
    report_period          date NOT NULL,
    superseded             boolean NOT NULL DEFAULT false,
    line_key               text GENERATED ALWAYS AS (
        cusip || '|' || COALESCE(put_call, '') || '|' || upper(COALESCE(investment_discretion, '')) || '|' || COALESCE(other_manager, '')
    ) STORED,
    CONSTRAINT holding_13f_line_unique UNIQUE (filing_id, line_key)
);

CREATE INDEX holding_13f_group_idx
    ON holding_13f (filer_id, report_period);

CREATE TABLE ownership_5pct (
    id                bigserial PRIMARY KEY,
    filing_id         bigint NOT NULL REFERENCES filing (id) ON DELETE CASCADE,
    security_id       bigint NOT NULL REFERENCES security (id),
    filer_id          bigint NOT NULL REFERENCES filer (id),
    form_type         text NOT NULL,
    shares            numeric(20, 4),
    percent_of_class  numeric(8, 4),
    cusip             text,
    class_title       text,
    as_of             date NOT NULL,
    CONSTRAINT ownership_5pct_filing_filer_unique UNIQUE (filing_id, filer_id)
);

CREATE INDEX ownership_5pct_security_filer_idx
    ON ownership_5pct (security_id, filer_id, as_of);

CREATE TABLE insider_txn (
    id                  bigserial PRIMARY KEY,
    filing_id           bigint NOT NULL REFERENCES filing (id) ON DELETE CASCADE,
    security_id         bigint NOT NULL REFERENCES security (id),
    filer_id            bigint NOT NULL REFERENCES filer (id),
    security_title      text,
    transaction_date    date,
    transaction_code    text,
    acquired_disposed   text,
    shares              numeric(20, 4),
    price_per_share     numeric(20, 4),
    shares_following    numeric(20, 4),
    direct_or_indirect  text,
    is_officer          boolean,
    is_director         boolean,
    is_ten_percent      boolean,
    officer_title       text
);

CREATE INDEX insider_txn_security_filer_idx
    ON insider_txn (security_id, filer_id, transaction_date);

-- Empty in this milestone. Later supplier/customer work fills it.
-- confidence is required so a relationship cannot be stored without a score.
CREATE TABLE company_relationship (
    id                 bigserial PRIMARY KEY,
    from_security_id   bigint NOT NULL REFERENCES security (id),
    to_security_id     bigint REFERENCES security (id),
    counterparty_name  text,
    relationship_type  text NOT NULL CHECK (length(trim(relationship_type)) > 0),
    confidence         numeric(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source             text,
    as_of              date,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX company_relationship_from_idx ON company_relationship (from_security_id);

CREATE MATERIALIZED VIEW current_holders AS
WITH long_13f AS (
    SELECT
        h.id,
        h.filing_id,
        h.security_id,
        h.filer_id,
        h.report_period,
        h.shares,
        h.value_usd
    FROM holding_13f h
    WHERE NOT h.superseded
      AND COALESCE(h.put_call, '') = ''
      AND COALESCE(NULLIF(h.share_type, ''), 'SH') = 'SH'
),
latest_13f_period AS (
    SELECT security_id, filer_id, MAX(report_period) AS report_period
    FROM long_13f
    GROUP BY security_id, filer_id
),
agg_13f AS (
    SELECT
        l.security_id,
        l.filer_id,
        SUM(l.shares) AS shares,
        SUM(l.value_usd) AS value_usd,
        lp.report_period AS as_of,
        (ARRAY_AGG(l.filing_id ORDER BY f.filed_at DESC, f.accession_number DESC))[1] AS filing_id
    FROM long_13f l
    JOIN latest_13f_period lp
      ON lp.security_id = l.security_id
     AND lp.filer_id = l.filer_id
     AND lp.report_period = l.report_period
    JOIN filing f ON f.id = l.filing_id
    GROUP BY l.security_id, l.filer_id, lp.report_period
),
pos_13f AS (
    SELECT
        a.security_id,
        a.filer_id,
        a.shares,
        a.value_usd,
        NULL::numeric AS percent_of_class,
        '13F'::text AS source,
        f.form_type,
        a.as_of,
        f.filed_at,
        f.accession_number,
        f.source_url AS filing_url
    FROM agg_13f a
    JOIN filing f ON f.id = a.filing_id
),
latest_5pct AS (
    SELECT DISTINCT ON (o.security_id, o.filer_id)
        o.security_id,
        o.filer_id,
        o.shares,
        NULL::numeric AS value_usd,
        o.percent_of_class,
        CASE
            WHEN o.form_type ILIKE '%13G%' THEN '13G'
            ELSE '13D'
        END AS source,
        o.form_type,
        o.as_of,
        f.filed_at,
        f.accession_number,
        f.source_url AS filing_url
    FROM ownership_5pct o
    JOIN filing f ON f.id = o.filing_id
    ORDER BY o.security_id, o.filer_id, o.as_of DESC, f.filed_at DESC, f.accession_number DESC
),
insider_balances AS (
    SELECT DISTINCT ON (t.security_id, t.filer_id, COALESCE(t.direct_or_indirect, 'D'))
        t.security_id,
        t.filer_id,
        t.shares_following,
        COALESCE(t.transaction_date, f.period_of_report, f.filed_at) AS as_of,
        f.filed_at,
        f.form_type,
        f.accession_number,
        f.source_url,
        t.filing_id
    FROM insider_txn t
    JOIN filing f ON f.id = t.filing_id
    WHERE t.shares_following IS NOT NULL
      AND t.security_title ~* '(common stock|common shares|ordinary shares|ordinary share)'
    ORDER BY
        t.security_id,
        t.filer_id,
        COALESCE(t.direct_or_indirect, 'D'),
        COALESCE(t.transaction_date, f.period_of_report, f.filed_at) DESC,
        f.filed_at DESC,
        t.id DESC
),
agg_insider AS (
    SELECT
        security_id,
        filer_id,
        SUM(shares_following) AS shares,
        MAX(as_of) AS as_of,
        (ARRAY_AGG(filing_id ORDER BY as_of DESC, filed_at DESC, accession_number DESC))[1] AS filing_id
    FROM insider_balances
    GROUP BY security_id, filer_id
),
pos_insider AS (
    SELECT
        a.security_id,
        a.filer_id,
        a.shares,
        NULL::numeric AS value_usd,
        NULL::numeric AS percent_of_class,
        '4'::text AS source,
        f.form_type,
        a.as_of,
        f.filed_at,
        f.accession_number,
        f.source_url AS filing_url
    FROM agg_insider a
    JOIN filing f ON f.id = a.filing_id
),
candidates AS (
    SELECT * FROM pos_13f
    UNION ALL
    SELECT * FROM latest_5pct
    UNION ALL
    SELECT * FROM pos_insider
),
overrides AS (
    SELECT c.*
    FROM candidates c
    WHERE c.source <> '13F'
      AND c.as_of >= COALESCE(
          (
              SELECT f13.as_of
              FROM candidates f13
              WHERE f13.security_id = c.security_id
                AND f13.filer_id = c.filer_id
                AND f13.source = '13F'
          ),
          DATE '0001-01-01'
      )
),
override_winners AS (
    SELECT DISTINCT ON (security_id, filer_id)
        *
    FROM overrides
    ORDER BY security_id, filer_id, as_of DESC, filed_at DESC, accession_number DESC
),
winners AS (
    SELECT * FROM override_winners
    UNION ALL
    SELECT c.*
    FROM candidates c
    WHERE c.source = '13F'
      AND NOT EXISTS (
          SELECT 1
          FROM override_winners o
          WHERE o.security_id = c.security_id
            AND o.filer_id = c.filer_id
      )
)
SELECT
    w.security_id,
    s.ticker,
    w.filer_id,
    fl.cik AS filer_cik,
    fl.name AS filer_name,
    w.shares,
    w.value_usd,
    w.percent_of_class,
    w.source,
    w.form_type,
    w.as_of,
    w.filed_at,
    w.accession_number,
    w.filing_url
FROM winners w
JOIN security s ON s.id = w.security_id
JOIN filer fl ON fl.id = w.filer_id;

CREATE UNIQUE INDEX current_holders_pk ON current_holders (security_id, filer_id);
CREATE INDEX current_holders_ticker_idx ON current_holders (ticker);
