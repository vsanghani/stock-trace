import { Minus, Plus } from "lucide-react"

const QUESTIONS = [
    {
        question: "Is Plutox financial advice?",
        answer:
            "No. Plutox is for information only. It is not a broker, and nothing on the site is a recommendation to buy, sell or hold a security.",
    },
    {
        question: "Do you recommend stocks?",
        answer:
            "Not today. You can look up a quote and the company stats that come with it. Recommendations and deeper analysis are still being added, and they will not be personal advice.",
    },
    {
        question: "Do I need an account?",
        answer:
            "This page, the blog and the legal pages are public. The dashboard and the other research tools ask you to sign in. Creating an account is free.",
    },
    {
        question: "Where do the figures come from?",
        answer:
            "Quotes and fundamentals are requested from a public market-data provider after you sign in. They can be delayed, incomplete or unavailable. Some analysis screens can fall back to sample output when an optional provider key is not set. Treat that output as a sample, not as a live reading.",
    },
    {
        question: "Is my portfolio uploaded?",
        answer:
            "Holdings, P&L trades and whisper alerts stay in your browser. They are not sent to Plutox servers.",
    },
    {
        question: "What should I use it for today?",
        answer:
            "Open the dashboard and read a stock. The other tools are there to click through. Expect the analysis to get deeper from here.",
    },
] as const

export function Faq() {
    return (
        <div className="mt-12 space-y-3">
            {QUESTIONS.map((item) => (
                <details key={item.question} name="faq" className="faq-item rounded-2xl border border-border bg-background/70 backdrop-blur-md">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                        <h3 className="text-base font-semibold">{item.question}</h3>
                        <Plus className="faq-icon-closed h-4 w-4 shrink-0" aria-hidden="true" />
                        <Minus className="faq-icon-open h-4 w-4 shrink-0" aria-hidden="true" />
                    </summary>
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
            ))}
        </div>
    )
}
