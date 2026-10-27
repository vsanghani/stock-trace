import Link from "next/link"

const LINKS = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#preview", label: "Preview" },
    { href: "#faq", label: "FAQ" },
] as const

export function LandingNav() {
    return (
        <nav aria-label="On this page" className="border-b border-border bg-background/60 backdrop-blur-md">
            <a href="#content" className="skip-link">
                Skip to content
            </a>
            <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {LINKS.map((link) => (
                        <li key={link.href}>
                            <a
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>
                <Link
                    href="/dashboard"
                    className="h-9 px-4 inline-flex w-fit items-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Open the app
                </Link>
            </div>
        </nav>
    )
}
