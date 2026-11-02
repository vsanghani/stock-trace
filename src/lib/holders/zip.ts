import { Readable } from "node:stream"
import * as yauzl from "yauzl"
import type { Entry, ZipFile } from "yauzl"

async function entriesByName(zip: ZipFile): Promise<Map<string, Entry>> {
    const found = new Map<string, Entry>()
    for await (const entry of zip.eachEntry()) {
        const base = entry.fileName.split("/").pop()?.toUpperCase()
        if (base) found.set(base, entry)
    }
    return found
}

async function openZip(zipPath: string): Promise<ZipFile> {
    return yauzl.openPromise(zipPath, { lazyEntries: true, autoClose: false })
}

export async function readZipText(zipPath: string, basename: string): Promise<string> {
    const zip = await openZip(zipPath)
    try {
        const entries = await entriesByName(zip)
        const entry = entries.get(basename.toUpperCase())
        if (!entry) throw new Error(`Zip ${zipPath} has no ${basename}`)
        const stream = await zip.openReadStreamPromise(entry)
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        return Buffer.concat(chunks).toString("utf8")
    } finally {
        zip.close()
    }
}

export async function openZipEntryStream(zipPath: string, basename: string): Promise<{ stream: Readable; close: () => void }> {
    const zip = await openZip(zipPath)
    const entries = await entriesByName(zip)
    const entry = entries.get(basename.toUpperCase())
    if (!entry) {
        zip.close()
        throw new Error(`Zip ${zipPath} has no ${basename}`)
    }
    const stream = await zip.openReadStreamPromise(entry)
    return {
        stream,
        close: () => zip.close(),
    }
}
