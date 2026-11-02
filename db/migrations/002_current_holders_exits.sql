-- Replace current_holders for databases that already applied 001.
-- A filer's 13F rows come only from that filer's latest report period,
-- and a zero-share 13D/13G or Form 4 removes the holder.

DROP MATERIALIZED VIEW IF EXISTS current_holders;

CREATE MATERIALIZED VIEW current_holders AS
WITH latest_filer_period AS (
    -- One report period per filer, not per security. A later 13F that omits
    -- a name means the filer has exited that name.
    SELECT filer_id, MAX(period_of_report) AS report_period
    FROM filing
    WHERE form_type LIKE '13F-HR%'
      AND filer_id IS NOT NULL
      AND period_of_report IS NOT NULL
    GROUP BY filer_id
),
long_13f AS (
    SELECT
        h.id,
        h.filing_id,
        h.security_id,
        h.filer_id,
        h.report_period,
        h.shares,
        h.value_usd
    FROM holding_13f h
    JOIN latest_filer_period lp
      ON lp.filer_id = h.filer_id
     AND lp.report_period = h.report_period
    WHERE NOT h.superseded
      AND COALESCE(h.put_call, '') = ''
      AND COALESCE(NULLIF(h.share_type, ''), 'SH') = 'SH'
),
agg_13f AS (
    SELECT
        l.security_id,
        l.filer_id,
        SUM(l.shares) AS shares,
        SUM(l.value_usd) AS value_usd,
        l.report_period AS as_of,
        (ARRAY_AGG(l.filing_id ORDER BY f.filed_at DESC, f.accession_number DESC))[1] AS filing_id
    FROM long_13f l
    JOIN filing f ON f.id = l.filing_id
    GROUP BY l.security_id, l.filer_id, l.report_period
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
JOIN filer fl ON fl.id = w.filer_id
WHERE w.shares IS NULL OR w.shares > 0;

CREATE UNIQUE INDEX current_holders_pk ON current_holders (security_id, filer_id);
CREATE INDEX current_holders_ticker_idx ON current_holders (ticker);
