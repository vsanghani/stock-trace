import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
})

export function parseXml(xml: string): unknown {
    return parser.parse(xml)
}

export function asArray(value: unknown): unknown[] {
    if (value == null) return []
    return Array.isArray(value) ? value : [value]
}

/** Read a Form 4 `<value>` wrapper or a plain text node. */
export function fieldText(node: unknown): string | null {
    if (node == null) return null
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
        const text = String(node).trim()
        return text || null
    }
    if (typeof node === "object" && "value" in node) {
        return fieldText((node as { value: unknown }).value)
    }
    return null
}

export function child(node: unknown, ...path: string[]): unknown {
    let current: unknown = node
    for (const key of path) {
        if (!current || typeof current !== "object") return undefined
        current = (current as Record<string, unknown>)[key]
    }
    return current
}

/** Pull the ownership or 13D/13G XML document out of a complete EDGAR submission. */
export function extractEmbeddedXml(submission: string): string | null {
    const blocks = submission.matchAll(/<XML>([\s\S]*?)<\/XML>/gi)
    for (const block of blocks) {
        const xml = block[1].trim()
        if (xml.includes("ownershipDocument") || xml.includes("edgarSubmission")) return xml
    }
    if (submission.includes("<ownershipDocument") || submission.includes("<edgarSubmission")) {
        return submission.trim()
    }
    return null
}
