const STATS = ["Market cap", "52-week high", "52-week low", "P/E"] as const

const TODAY = [
    "Latest price and daily change",
    "Market cap and 52-week range",
    "Ratios, when the data provider has them",
] as const

function PlaceholderValue() {
    return (
        <span className="text-lg font-mono font-bold mt-1 text-foreground/90">
            <span aria-hidden="true">—</span>
            <span className="sr-only">Placeholder</span>
        </span>
    )
}

export function ProductPreview() {
    return (
        <figure aria-label="Static sample of the research dashboard. Values are placeholders, not a live quote.">
            <div className="rounded-3xl border border-border bg-background/40 p-3 sm:p-4 backdrop-blur-md">
                <div className="glass rounded-xl shadow-lg p-6 md:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Dashboard preview
                        </p>
                        <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">DEMO</p>
                        <p className="text-muted-foreground text-lg">Sample layout</p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Latest price
                        </p>
                        <p className="text-3xl font-mono font-bold sm:text-4xl">Sample</p>
                        <p className="text-sm text-muted-foreground">Shown when you open a ticker</p>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STATS.map((label) => (
                        <div key={label} className="glass p-4 rounded-xl flex flex-col items-start justify-center">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                                {label}
                            </span>
                            <PlaceholderValue />
                        </div>
                    ))}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="glass rounded-xl p-6">
                        <h3 className="font-semibold">On this screen today</h3>
                        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                            {TODAY.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass rounded-xl p-6">
                        <h3 className="font-semibold">Recommendations</h3>
                        <p className="mt-4 font-mono text-sm font-semibold uppercase tracking-widest">Coming</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Not shown yet. Plutox does not make a buy or sell call.
                        </p>
                    </div>
                </div>
            </div>
            <figcaption className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Static sample of the dashboard layout. Placeholders only — not a live quote and not a performance claim.
            </figcaption>
        </figure>
    )
}
