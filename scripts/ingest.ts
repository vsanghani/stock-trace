import {
    closeIngest,
    ingest13f,
    ingestCik,
    ingestForm4,
    ingestOwnership,
    parseIngestDate,
    pruneOldFilings,
    refreshHolders,
} from "../src/lib/holders/ingest"

const log = (message: string) => {
    console.log(message)
}

function readDate(argv: string[]): string | undefined {
    const index = argv.indexOf("--date")
    if (index === -1) return undefined
    return parseIngestDate(argv[index + 1])
}

const command = process.argv[2] ?? "all"
const date = readDate(process.argv.slice(2))

async function main() {
    if (!["all", "daily", "cik", "13f", "ownership", "form4"].includes(command)) {
        throw new Error("Usage: tsx scripts/ingest.ts [all|daily|cik|13f|ownership|form4] [--date YYYY-MM-DD]")
    }
    if (command === "all" || command === "daily" || command === "cik" || command === "13f") await ingestCik(log)
    if (command === "all" || command === "13f") await ingest13f(log)
    if (command === "all" || command === "daily" || command === "ownership") await ingestOwnership(log, date)
    if (command === "all" || command === "daily" || command === "form4") await ingestForm4(log, date)
    if (command !== "cik") {
        await pruneOldFilings(log)
        await refreshHolders(log)
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(async () => {
        await closeIngest()
    })
