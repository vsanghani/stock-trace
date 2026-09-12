import type { ReactNode } from "react"
import Link from "next/link"
import { COMPANY_NAME, COMPANY_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"

const PRODUCT_LINKS = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/blog", label: "Blog" },
    { href: "/valuation", label: "Valuation" },
    { href: "/options", label: "Options" },
]

const COMPANY_LINKS = [
    { href: "/about", label: "About us" },
    { href: "/company", label: "Company" },
    { href: "/blog", label: "Blog" },
    { href: COMPANY_URL, label: COMPANY_NAME, external: true },
]

const LEGAL_LINKS = [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms of use" },
]

function FooterLink({
    href,
    label,
    external,
}: {
    href: string
    label: string
    external?: boolean
}) {
    const className =
        "text-sm text-muted-foreground hover:text-foreground transition-colors"

    if (external) {
        return (
            <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
            >
                {label}
            </Link>
        )
    }

    return (
        <Link href={href} className={className}>
            {label}
        </Link>
    )
}

function FooterColumn({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                {title}
            </h2>
            <ul className="mt-4 space-y-2.5">{children}</ul>
        </div>
    )
}

export function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer className="relative z-10 mt-auto border-t border-border bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-6 py-14">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" className="text-lg font-bold tracking-tighter">
                            {SITE_NAME}
                        </Link>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                            {SITE_DESCRIPTION}
                        </p>
                    </div>

                    <FooterColumn title="Product">
                        {PRODUCT_LINKS.map((link) => (
                            <li key={link.href + link.label}>
                                <FooterLink {...link} />
                            </li>
                        ))}
                    </FooterColumn>

                    <FooterColumn title="Company">
                        {COMPANY_LINKS.map((link) => (
                            <li key={link.href + link.label}>
                                <FooterLink {...link} />
                            </li>
                        ))}
                    </FooterColumn>

                    <FooterColumn title="Legal">
                        {LEGAL_LINKS.map((link) => (
                            <li key={link.href}>
                                <FooterLink {...link} />
                            </li>
                        ))}
                    </FooterColumn>
                </div>
            </div>

            <div className="border-t border-border">
                <div className="container mx-auto flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        © {year} {SITE_NAME}. Built by{" "}
                        <Link
                            href={COMPANY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline transition-colors"
                        >
                            {COMPANY_NAME}
                        </Link>
                        . Not financial advice.
                    </p>
                    <div className="flex items-center gap-4">
                        {LEGAL_LINKS.map((link) => (
                            <FooterLink key={link.href} {...link} />
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
