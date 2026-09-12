import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY_NAME, COMPANY_URL, pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "About us",
    `Who we are and why we built ${SITE_NAME}.`
)

export default function AboutPage() {
    return (
        <LegalPage
            title="About us"
            description={`${SITE_NAME} is a research workspace for listed companies — fundamentals, sentiment, valuation and portfolio risk in one place.`}
        >
            <h2>What we do</h2>
            <p>
                Looking up a ticker should not mean bouncing between a charting site, a
                filings archive and a spreadsheet. {SITE_NAME} puts the numbers that
                matter on one screen: live price and fundamentals, analyst targets,
                AI-scored news sentiment, a DCF model you can stress, an options chain,
                and tools for correlation, portfolio shocks, P&amp;L and alerts.
            </p>

            <h2>How we work</h2>
            <ul>
                <li>
                    Market data comes from public providers and is shown as-is. It may
                    be delayed or incomplete.
                </li>
                <li>
                    Portfolio holdings, P&amp;L trades and whisper alerts stay on your
                    device. We do not upload that book to our servers.
                </li>
                <li>
                    An account is only required for the research app. The marketing
                    site, blog and legal pages are public.
                </li>
            </ul>

            <h2>What we are not</h2>
            <p>
                {SITE_NAME} is a research tool, not a broker and not financial advice.
                Nothing on this site is a recommendation to buy, sell or hold any
                security. Always do your own research before making an investment
                decision.
            </p>

            <h2>Who builds it</h2>
            <p>
                {SITE_NAME} is a product of{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    {COMPANY_NAME}
                </Link>
                . Read more on our{" "}
                <Link href="/company">company</Link> page, or review how we handle
                data in the <Link href="/privacy">privacy policy</Link> and{" "}
                <Link href="/terms">terms</Link>.
            </p>
        </LegalPage>
    )
}
