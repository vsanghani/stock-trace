import { writeFile } from "node:fs/promises"
import { createRateLimiter, type RateLimiter } from "@/lib/holders/rate-limit"

const RETRY_STATUS = new Set([429, 503])

export async function secFetch(url: string, userAgent: string, limit: RateLimiter): Promise<Response> {
    let last: Response | null = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await limit(() =>
            fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    Accept: "*/*",
                    "Accept-Encoding": "gzip, deflate",
                },
            }),
        )
        last = response
        if (!RETRY_STATUS.has(response.status)) return response
        await response.arrayBuffer().catch(() => undefined)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
    if (!last) throw new Error(`No response from ${url}`)
    return last
}

export async function secText(url: string, userAgent: string, limit: RateLimiter): Promise<string> {
    const response = await secFetch(url, userAgent, limit)
    if (!response.ok) {
        throw new Error(`SEC request failed (${response.status}) for ${url}`)
    }
    return response.text()
}

/** Daily indexes are absent on weekends and market holidays. */
export async function secTextIfExists(url: string, userAgent: string, limit: RateLimiter): Promise<string | null> {
    const response = await secFetch(url, userAgent, limit)
    if (response.status === 404) return null
    if (!response.ok) {
        throw new Error(`SEC request failed (${response.status}) for ${url}`)
    }
    return response.text()
}

export async function secDownload(url: string, dest: string, userAgent: string, limit: RateLimiter): Promise<void> {
    const response = await secFetch(url, userAgent, limit)
    if (!response.ok) {
        throw new Error(`SEC download failed (${response.status}) for ${url}`)
    }
    await writeFile(dest, Buffer.from(await response.arrayBuffer()))
}

export function defaultLimiter(): RateLimiter {
    return createRateLimiter()
}
