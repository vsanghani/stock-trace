import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY_NAME, COMPANY_URL, pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "Privacy policy",
    `How ${SITE_NAME} collects, uses and stores information.`
)

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy policy"
            lastUpdated="12 September 2026"
            description={`This policy describes how ${SITE_NAME} (${COMPANY_NAME}) handles information when you use the site and the research app.`}
        >
            <h2>Who we are</h2>
            <p>
                {SITE_NAME} is operated by {COMPANY_NAME}. If we refer to “we” or
                “us” in this policy, we mean {COMPANY_NAME}. The product is available
                at this website and related pages we publish.
            </p>

            <h2>Information we collect</h2>
            <h3>Account information</h3>
            <p>
                If you create an account, our authentication provider (Clerk)
                processes the details you submit — typically an email address, or
                the profile information you allow through a social sign-in. We use
                that account to keep you signed in and to protect research routes
                and market-data APIs.
            </p>

            <h3>Usage that stays on your device</h3>
            <p>
                Portfolio holdings, P&amp;L trades, correlation inputs, stress-test
                scenarios and whisper alerts are stored in your browser (local
                storage). That book is not uploaded to our servers as part of
                normal use.
            </p>

            <h3>Requests you make in the app</h3>
            <p>
                When you search a ticker or open a report, we process the symbol
                you asked for so we can return quotes, fundamentals, options,
                valuation inputs or sentiment. Signed-out visitors can use ticker
                autocomplete; that endpoint returns symbol names only.
            </p>

            <h2>Cookies and similar technology</h2>
            <p>
                We use cookies and similar storage that Clerk needs to create and
                maintain a session, plus your theme preference in the browser. We
                do not run a separate advertising cookie program on {SITE_NAME}.
            </p>

            <h2>How we use information</h2>
            <ul>
                <li>To provide and secure the site, accounts and research tools</li>
                <li>To fetch the market data you requested</li>
                <li>To remember display preferences such as light or dark theme</li>
                <li>To diagnose outages and abuse of the service</li>
            </ul>
            <p>We do not sell your personal information.</p>

            <h2>Processors and data sources</h2>
            <p>
                We rely on third parties to run the product. Depending on what you
                use, that can include:
            </p>
            <ul>
                <li>Clerk, for authentication and session management</li>
                <li>Yahoo Finance, for quotes, search and company data</li>
                <li>
                    Optional providers for sentiment and fundamentals (for example
                    OpenRouter, Alpha Vantage and Financial Modeling Prep) when those
                    integrations are enabled
                </li>
                <li>Our hosting provider, to serve the application</li>
            </ul>
            <p>
                Those parties process data under their own terms. Market data they
                supply may be delayed or incomplete.
            </p>

            <h2>How long we keep it</h2>
            <p>
                Account records last for as long as your account remains open.
                Browser-stored tools last until you clear site data or remove them
                in the product. Server logs are kept only as long as needed to
                operate and secure the service.
            </p>

            <h2>Your choices</h2>
            <p>
                You can close your account through the account menu, clear local
                tool data in your browser, and request access or deletion of
                account information via{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    {COMPANY_NAME}
                </Link>
                . Where a data-protection law gives you further rights, we will
                honour a valid request.
            </p>

            <h2>Children</h2>
            <p>
                {SITE_NAME} is not directed at children under 16, and we do not
                knowingly collect personal information from them.
            </p>

            <h2>Changes</h2>
            <p>
                We may update this policy as the product changes. The “Last
                updated” date at the top will change when we do. Continued use
                after an update means you accept the revised policy.
            </p>

            <h2>Contact</h2>
            <p>
                Privacy questions can be sent to {COMPANY_NAME} through{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    {COMPANY_URL.replace(/^https?:\/\//, "")}
                </Link>
                . See also our <Link href="/terms">terms of use</Link>.
            </p>
        </LegalPage>
    )
}
