import Link from "next/link"
import { COMPANY_NAME, COMPANY_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"

const COLUMNS = [
    {
        title: "Product",
        links: [
            { href: "/", label: "Home" },
            { href: "/dashboard", label: "Dashboard" },
            { href: "/valuation", label: "Valuation" },
            { href: "/options", label: "Options" },
        ],
    },
    {
        title: "Company",
        links: [
            { href: "/about", label: "About us" },
            { href: "/company", label: "Company" },
            { href: "/blog", label: "Blog" },
        ],
    },
    {
        title: "Legal",
        links: [
            { href: "/privacy", label: "Privacy policy" },
            { href: "/terms", label: "Terms of use" },
        ],
    },
] as const

export function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer className="relative z-10 mt-auto border-t border-border bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-6 py-12">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                    <Link href="/" className="text-lg font-bold tracking-tighter shrink-0">
                        {SITE_NAME}
                    </Link>
                    <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-right">
                        {SITE_DESCRIPTION}
                    </p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
                    {COLUMNS.map((column) => (
                        <div key={column.title}>
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                                {column.title}
                            </h2>
                            <ul className="mt-4 space-y-2.5">
                                {column.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-border">
                <div className="container mx-auto flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
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
                        .
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Not financial advice.
                    </p>
                </div>
            </div>
        </footer>
    )
}
