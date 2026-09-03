import Link from "next/link"

const VRTX_LABS_URL = "https://www.vrtxlabs.tech"

export function Footer() {
    return (
        <footer className="relative z-10 mt-auto border-t border-border/50 bg-background/60 backdrop-blur-md">
            <p className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
                Built by{" "}
                <Link
                    href={VRTX_LABS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                    Vrtx Labs
                </Link>
            </p>
        </footer>
    )
}
