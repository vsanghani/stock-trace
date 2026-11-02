/**
 * Drop credentials before an event leaves the process. Sentry is a no-op
 * unless a DSN is configured; this still runs on every event we do send.
 */

const HEADER_PATTERN = /auth|cookie|token|secret|api-key|apikey/i
const QUERY_PATTERN = /token|secret|password|apikey|api_key|auth|session|jwt|credential/i

export interface ScrubbableRequest {
    url?: string
    headers?: Record<string, string | undefined>
    cookies?: Record<string, string> | string
    query_string?: string | Record<string, string> | Array<[string, string]>
    data?: unknown
}

export interface ScrubbableEvent {
    request?: ScrubbableRequest
    breadcrumbs?: Array<{ data?: Record<string, unknown> }>
}

function scrubUrl(value: string): string {
    try {
        const url = new URL(value)
        for (const key of [...url.searchParams.keys()]) {
            if (QUERY_PATTERN.test(key)) url.searchParams.set(key, "[Scrubbed]")
        }
        return url.toString()
    } catch {
        return value.replace(
            /([?&][^=&#]*(?:token|secret|password|apikey|api_key|auth|session|jwt|credential)[^=&#]*=)[^&#]*/gi,
            "$1[Scrubbed]"
        )
    }
}

function scrubQuery(value: ScrubbableRequest["query_string"]): ScrubbableRequest["query_string"] {
    if (typeof value === "string") return scrubUrl(`https://scrub.invalid/?${value.replace(/^\?/, "")}`).split("?")[1] ?? ""
    if (Array.isArray(value)) {
        return value.map(([key, entry]): [string, string] => [key, QUERY_PATTERN.test(key) ? "[Scrubbed]" : entry])
    }
    if (value && typeof value === "object") {
        const next: Record<string, string> = {}
        for (const [key, entry] of Object.entries(value)) {
            next[key] = QUERY_PATTERN.test(key) ? "[Scrubbed]" : entry
        }
        return next
    }
    return value
}

function scrubHeaders(headers: Record<string, string | undefined>): Record<string, string | undefined> {
    const next: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(headers)) {
        next[key] = HEADER_PATTERN.test(key) ? "[Scrubbed]" : value
    }
    return next
}

function scrubData(data: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
        if (key === "url" && typeof value === "string") next[key] = scrubUrl(value)
        else if ((key === "cookie" || key === "cookies" || HEADER_PATTERN.test(key)) && typeof value === "string") {
            next[key] = "[Scrubbed]"
        } else next[key] = value
    }
    return next
}

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
    const request = event.request
    if (request) {
        if (request.headers) request.headers = scrubHeaders(request.headers)
        if (request.cookies) request.cookies = {}
        if (request.url) request.url = scrubUrl(request.url)
        if (request.query_string !== undefined) request.query_string = scrubQuery(request.query_string)
    }

    if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
            if (crumb.data) crumb.data = scrubData(crumb.data)
        }
    }

    return event
}
