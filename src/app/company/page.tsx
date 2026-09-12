import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY_NAME, COMPANY_URL, pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "Company",
    `${COMPANY_NAME} — the studio behind ${SITE_NAME}.`
)

export default function CompanyPage() {
    return (
        <LegalPage
            title="Company"
            description={`${SITE_NAME} is designed, built and operated by ${COMPANY_NAME}.`}
        >
            <h2>{COMPANY_NAME}</h2>
            <p>
                {COMPANY_NAME} builds software for people who need a clear view of
                markets and their own positions. {SITE_NAME} is our equity-research
                product: search a listing, read the fundamentals and sentiment, then
                pressure-test a portfolio with valuation, correlation and scenario
                tools.
            </p>
            <p>
                Learn more about the studio at{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    {COMPANY_URL.replace(/^https?:\/\//, "")}
                </Link>
                .
            </p>

            <h2>The product</h2>
            <p>
                {SITE_NAME} covers major exchanges including NYSE, NASDAQ, ASX, HKEX,
                JPX and LSE, with search across further global listings. The public
                site explains the product; the research app sits behind a free
                account.
            </p>
            <p>
                Read the full story on our <Link href="/about">about</Link> page, or
                browse the <Link href="/blog">blog</Link> for notes and analysis.
            </p>

            <h2>Contact</h2>
            <p>
                For product questions, press or partnership enquiries, reach{" "}
                {COMPANY_NAME} through{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    the studio website
                </Link>
                .
            </p>
        </LegalPage>
    )
}
