import { createInterface } from "node:readline"
import type { Readable } from "node:stream"

/** Split one TSV line, honouring double quotes. */
export function splitTsv(line: string): string[] {
    const cells: string[] = []
    let current = ""
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '"') {
            if (quoted && line[i + 1] === '"') {
                current += '"'
                i += 1
            } else {
                quoted = !quoted
            }
            continue
        }
        if (char === "\t" && !quoted) {
            cells.push(current)
            current = ""
            continue
        }
        current += char
    }
    cells.push(current)
    return cells
}

export function parseTsv(text: string): Record<string, string>[] {
    const rows: Record<string, string>[] = []
    let headers: string[] | null = null
    for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue
        const cells = splitTsv(line).map((cell) => cell.trim())
        if (!headers) {
            headers = cells
            continue
        }
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
            row[header] = cells[index] ?? ""
        })
        rows.push(row)
    }
    return rows
}

export async function forEachTsvRow(
    stream: Readable,
    onRow: (row: Record<string, string>) => Promise<void> | void,
): Promise<void> {
    const lines = createInterface({ input: stream, crlfDelay: Infinity })
    let headers: string[] | null = null
    for await (const line of lines) {
        if (!line.trim()) continue
        const cells = splitTsv(line)
        if (!headers) {
            headers = cells.map((cell) => cell.trim())
            continue
        }
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
            row[header] = (cells[index] ?? "").trim()
        })
        await onRow(row)
    }
}

export function column(row: Record<string, string>, ...names: string[]): string {
    const wanted = new Set(names.map((name) => name.toLowerCase()))
    for (const [key, value] of Object.entries(row)) {
        if (wanted.has(key.toLowerCase()) && value.trim()) return value.trim()
    }
    return ""
}
