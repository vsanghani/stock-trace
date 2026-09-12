import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { COMPANY_NAME, COMPANY_URL, pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "Terms of use",
    `The terms that govern use of ${SITE_NAME}.`
)

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of use"
            lastUpdated="12 September 2026"
            description={`These terms govern access to ${SITE_NAME}, a research product operated by ${COMPANY_NAME}. By using the site you agree to them.`}
        >
            <h2>The service</h2>
            <p>
                {SITE_NAME} provides market research tools: company lookup,
                fundamentals, sentiment, valuation, options, correlation, portfolio
                stress testing, P&amp;L tracking and alerts. Some features require a
                free account. We may change, suspend or discontinue parts of the
                service at any time.
            </p>

            <h2>Not financial advice</h2>
            <p>
                {SITE_NAME} is a research tool. Nothing on the site is an offer,
                solicitation or recommendation to buy, sell or hold any security,
                or personalised financial, tax or legal advice. Market data is
                provided as-is and may be delayed, incomplete or wrong. You are
                solely responsible for your investment decisions.
            </p>

            <h2>Accounts</h2>
            <p>
                You must provide accurate details when you register and keep your
                login secure. You are responsible for activity under your account.
                We may suspend or close an account that we reasonably believe has
                been used in breach of these terms or in a way that harms the
                service or other users.
            </p>

            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
                <li>Misuse the service or attempt to disrupt or overload it</li>
                <li>
                    Scrape, bulk-download or resell market data or site content
                    except as the interface already allows for your own research
                </li>
                <li>Bypass authentication or access another person’s account</li>
                <li>Use {SITE_NAME} for any unlawful purpose</li>
            </ul>

            <h2>Your data</h2>
            <p>
                Holdings, trades and alerts you enter are stored in your browser
                unless a feature says otherwise. You retain responsibility for
                that information. How we handle account and usage data is
                described in the <Link href="/privacy">privacy policy</Link>,
                which forms part of these terms.
            </p>

            <h2>Intellectual property</h2>
            <p>
                {SITE_NAME}, its design and original content belong to{" "}
                {COMPANY_NAME} or our licensors. Market data and third-party marks
                remain the property of their owners. You may not copy the product
                or present it as your own.
            </p>

            <h2>Third-party services</h2>
            <p>
                Quotes, news, authentication and hosting depend on third parties.
                Their availability and terms are outside our control. A failure or
                change at a provider may affect what you see in {SITE_NAME}.
            </p>

            <h2>Disclaimer and liability</h2>
            <p>
                The service is provided “as is” and “as available”, without
                warranties of any kind, including accuracy, completeness or
                fitness for a particular purpose. To the fullest extent permitted
                by law, {COMPANY_NAME} is not liable for any loss arising from
                your use of {SITE_NAME} or from reliance on data shown in it,
                including lost profits or investment losses. Where liability
                cannot be excluded, it is limited to the amount you paid us for
                the service in the twelve months before the claim (which may be
                zero).
            </p>

            <h2>Changes</h2>
            <p>
                We may update these terms as the product changes. The “Last
                updated” date will change when we do. If you continue to use{" "}
                {SITE_NAME} after an update, you accept the revised terms.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about these terms can be sent to {COMPANY_NAME} through{" "}
                <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
                    {COMPANY_URL.replace(/^https?:\/\//, "")}
                </Link>
                .
            </p>
        </LegalPage>
    )
}
